import React, { useState, useEffect } from 'react';
import { Camera, ShieldCheck, AlertCircle, Settings, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { nativeMediaScanner, PermissionStatus, GalleryPermissionState } from '../services/nativeMediaScanner';
import { Capacitor } from '@capacitor/core';

interface GalleryPermissionModalProps {
  onManualUploadClick?: () => void;
}

export const GalleryPermissionModal: React.FC<GalleryPermissionModalProps> = ({ onManualUploadClick }) => {
  const [status, setStatus] = useState<PermissionStatus>({
    granted: false,
    permissionState: 'prompt',
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check initial permission state and subscribe to changes
    const unsubscribe = nativeMediaScanner.subscribePermission((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // If granted or dismissed by user for this session, don't display
  if (status.granted && status.permissionState === 'granted') {
    return null;
  }

  // Only show native prompt/banner on native platform or when testing permission states
  if (!Capacitor.isNativePlatform() && isDismissed) {
    return null;
  }

  if (isDismissed && status.permissionState !== 'denied') {
    return null;
  }

  const handleAllowClick = async () => {
    setIsRequesting(true);
    try {
      if (status.permissionState === 'denied') {
        await nativeMediaScanner.openSettings();
      } else {
        await nativeMediaScanner.requestPermission();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const isPartial = status.permissionState === 'partial';
  const isDenied = status.permissionState === 'denied';

  return (
    <div
      id="gallery-permission-banner"
      className="mb-4 rounded-xl border border-[#CCFF00]/20 bg-[#0D1117] p-4 text-[#F8FAFC] shadow-lg transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#CCFF00]/10 text-[#CCFF00]">
            {isDenied ? (
              <AlertCircle className="h-5 w-5 text-[#FF6600]" />
            ) : isPartial ? (
              <CheckCircle2 className="h-5 w-5 text-[#00FF66]" />
            ) : (
              <Camera className="h-5 w-5 text-[#CCFF00]" />
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#F8FAFC]">
              {isDenied
                ? 'Photo Access Needed'
                : isPartial
                ? 'Selected Photos Access'
                : 'Automatic Screenshot Detection'}
            </h4>
            <p className="text-xs leading-relaxed text-[#94A3B8]">
              {isDenied ? (
                <>
                  SnapFind needs access to your photos so it can find and index your screenshots. Since
                  permission was denied, please enable it in your device settings.
                </>
              ) : isPartial ? (
                <>
                  SnapFind can currently only access photos you selected. To automatically detect all new
                  screenshots, grant full photo access in settings.
                </>
              ) : (
                <>SnapFind needs access to your photos so it can find and index your screenshots.</>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                id="btn-allow-gallery-permission"
                type="button"
                onClick={handleAllowClick}
                disabled={isRequesting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#CCFF00] px-3.5 py-1.5 text-xs font-semibold text-[#07090D] transition-colors hover:bg-[#b8e600] active:scale-95 disabled:opacity-50"
              >
                {isDenied ? (
                  <>
                    <Settings className="h-3.5 w-3.5" />
                    Open App Settings
                  </>
                ) : isPartial ? (
                  <>
                    <Settings className="h-3.5 w-3.5" />
                    Grant Full Access
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Allow Photo Access
                  </>
                )}
              </button>

              {onManualUploadClick && (
                <button
                  id="btn-manual-photo-picker"
                  type="button"
                  onClick={onManualUploadClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#121821] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition-colors hover:bg-[#1E293B] hover:text-[#F8FAFC]"
                >
                  Pick Screenshots Manually
                </button>
              )}

              <button
                id="btn-dismiss-permission-banner"
                type="button"
                onClick={() => setIsDismissed(true)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-[#64748B] transition-colors hover:text-[#94A3B8]"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => setIsDismissed(true)}
          className="rounded p-1 text-[#64748B] hover:bg-[#121821] hover:text-[#94A3B8]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
