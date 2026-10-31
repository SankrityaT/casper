import type { Metadata } from "next";
import Room from "./room";

export const metadata: Metadata = { title: "Casper · #autopay-launch" };

export default function AppPage() {
  return <Room />;
}
