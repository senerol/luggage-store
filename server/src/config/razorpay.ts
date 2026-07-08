import Razorpay from "razorpay";
import { env } from "./env";

// Server-side Razorpay client. The key SECRET never leaves this file's
// module scope / process env - the frontend only ever receives the public
// RAZORPAY_KEY_ID plus an order id, never the secret.
export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});
