import type { Metadata } from "next";
import { MyDeals } from "./MyDeals";

export const metadata: Metadata = {
  title: "My deals · Clasp",
  description: "Your listings and deals on this device.",
};

export default function MyDealsPage() {
  return <MyDeals />;
}
