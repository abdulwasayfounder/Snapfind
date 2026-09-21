package com.snapfind.ai;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "SnapFindBillingPlugin")
public class SnapFindBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private boolean isClientReady = false;
    private final Map<String, ProductDetails> productDetailsCache = new HashMap<>();
    private PluginCall activePurchaseCall = null;

    @Override
    public void load() {
        super.load();
        initBillingClient();
    }

    private void initBillingClient() {
        if (billingClient != null) {
            return;
        }

        PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build();

        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(pendingPurchasesParams)
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isClientReady = true;
                    preloadProducts();
                } else {
                    isClientReady = false;
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isClientReady = false;
            }
        });
    }

    private void preloadProducts() {
        if (!isClientReady || billingClient == null) return;

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId("snapfind_pro")
                .setProductType(BillingClient.ProductType.SUBS)
                .build());
        productList.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId("snapfind_pro_lifetime")
                .setProductType(BillingClient.ProductType.INAPP)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(@NonNull BillingResult billingResult, @NonNull List<ProductDetails> list) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (ProductDetails details : list) {
                        productDetailsCache.put(details.getProductId(), details);
                    }
                }
            }
        });
    }

    @PluginMethod
    public void initializeBilling(PluginCall call) {
        if (isClientReady) {
            JSObject res = new JSObject();
            res.put("ready", true);
            call.resolve(res);
            return;
        }

        initBillingClient();
        JSObject res = new JSObject();
        res.put("ready", isClientReady);
        call.resolve(res);
    }

    @PluginMethod
    public void launchPurchaseFlow(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("Product ID is required");
            return;
        }

        if (!isClientReady || billingClient == null) {
            call.reject("Google Play Billing client is not connected");
            return;
        }

        activePurchaseCall = call;

        // Parse base plan if formatted as productId:basePlanId
        String cleanProductId = productId;
        String basePlanId = null;
        if (productId.contains(":")) {
            String[] parts = productId.split(":");
            cleanProductId = parts[0];
            basePlanId = parts[1];
        }

        ProductDetails details = productDetailsCache.get(cleanProductId);
        if (details == null) {
            // Re-fetch product details
            fetchAndLaunchPurchase(cleanProductId, basePlanId, call);
            return;
        }

        startBillingFlow(details, basePlanId, call);
    }

    private void fetchAndLaunchPurchase(String productId, String basePlanId, PluginCall call) {
        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, list) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                ProductDetails details = list.get(0);
                productDetailsCache.put(details.getProductId(), details);
                new Handler(Looper.getMainLooper()).post(() -> startBillingFlow(details, basePlanId, call));
            } else {
                call.reject("Could not find product details in Google Play: " + billingResult.getDebugMessage());
            }
        });
    }

    private void startBillingFlow(ProductDetails details, String basePlanId, PluginCall call) {
        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();

        if (details.getProductType().equals(BillingClient.ProductType.SUBS)) {
            List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
            String offerToken = "";

            if (offers != null && !offers.isEmpty()) {
                if (basePlanId != null) {
                    for (ProductDetails.SubscriptionOfferDetails offer : offers) {
                        if (basePlanId.equals(offer.getBasePlanId())) {
                            offerToken = offer.getOfferToken();
                            break;
                        }
                    }
                }
                if (offerToken.isEmpty()) {
                    offerToken = offers.get(0).getOfferToken();
                }
            }

            productDetailsParamsList.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(details)
                            .setOfferToken(offerToken)
                            .build()
            );
        } else {
            productDetailsParamsList.add(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(details)
                            .build()
            );
        }

        BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList)
                .build();

        BillingResult result = billingClient.launchBillingFlow(getActivity(), billingFlowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject("Launch billing flow failed: " + result.getDebugMessage());
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (activePurchaseCall == null) return;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("purchaseToken", purchase.getPurchaseToken());
                    res.put("orderId", purchase.getOrderId());
                    res.put("purchaseTime", purchase.getPurchaseTime());
                    if (!purchase.getProducts().isEmpty()) {
                        res.put("productId", purchase.getProducts().get(0));
                    }
                    activePurchaseCall.resolve(res);
                    activePurchaseCall = null;
                    return;
                }
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            activePurchaseCall.reject("Purchase cancelled by user");
        } else {
            activePurchaseCall.reject("Purchase failed: " + billingResult.getDebugMessage());
        }
        activePurchaseCall = null;
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!isClientReady || billingClient == null) {
            call.reject("Billing client not connected");
            return;
        }

        billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build(),
                new PurchasesResponseListener() {
                    @Override
                    public void onQueryPurchasesResponse(@NonNull BillingResult billingResult, @NonNull List<Purchase> list) {
                        JSObject result = new JSObject();
                        JSArray purchasesArray = new JSArray();

                        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                            for (Purchase purchase : list) {
                                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                                    JSObject item = new JSObject();
                                    item.put("purchaseToken", purchase.getPurchaseToken());
                                    item.put("orderId", purchase.getOrderId());
                                    item.put("purchaseTime", purchase.getPurchaseTime());
                                    item.put("acknowledged", purchase.isAcknowledged());
                                    if (!purchase.getProducts().isEmpty()) {
                                        item.put("productId", purchase.getProducts().get(0));
                                    }
                                    purchasesArray.put(item);
                                }
                            }
                        }

                        result.put("purchases", purchasesArray);
                        call.resolve(result);
                    }
                }
        );
    }

    @PluginMethod
    public void openSubscriptionManagement(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            String sku = call.getString("sku", "snapfind_pro");
            Uri uri = Uri.parse("https://play.google.com/store/account/subscriptions?sku=" + sku + "&package=" + packageName);
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open Play Store: " + e.getMessage());
        }
    }
}
