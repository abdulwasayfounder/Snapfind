import React from "react";
import { PageHero3D, PageHero3DProps, PageHero3DType } from "./PageHero3D";

export type Hero3dObjectType = PageHero3DType;

export interface Hero3dObjectProps extends PageHero3DProps {}

export const Hero3dObject: React.FC<Hero3dObjectProps> = (props) => {
  return <PageHero3D {...props} />;
};
