"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(CustomEase, useGSAP);

export const DUR = { s: 0.4, m: 0.8, l: 1.2 };
export const STAGGER = 0.08;

CustomEase.create("out", "0.2, 0.7, 0.2, 1");
CustomEase.create("inOut", "0.65, 0, 0.35, 1");

export { gsap, useGSAP };
