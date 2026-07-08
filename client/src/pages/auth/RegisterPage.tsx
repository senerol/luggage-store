import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Luggage, User, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { extractErrorMessage } from "@/api/client";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional(),
    password: z.string().min(8, "At least 8 characters"),
    role: z.enum(["CUSTOMER", "PARTNER"]),
    businessName: z.string().optional(),
  })
  .refine((data) => data.role !== "PARTNER" || (data.businessName && data.businessName.trim().length > 1), {
    message: "Business name is required for partner accounts",
    path: ["businessName"],
  });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const initialRole = params.get("role") === "PARTNER" ? "PARTNER" : "CUSTOMER";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: initialRole },
  });

  const role = watch("role");

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const user = await registerUser(values);
      toast.success(`Welcome to Luggo, ${user.name.split(" ")[0]}!`);
      navigate(user.role === "PARTNER" ? "/partner/apply" : "/bookings");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Luggage className="h-5 w-5" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-ink-900">Create your account</h1>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1">
          <button
            type="button"
            onClick={() => setValue("role", "CUSTOMER")}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
              role === "CUSTOMER" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
            )}
          >
            <User className="h-4 w-4" /> Customer
          </button>
          <button
            type="button"
            onClick={() => setValue("role", "PARTNER")}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
              role === "PARTNER" ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
            )}
          >
            <Building2 className="h-4 w-4" /> Storage partner
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <div>
            <label className="text-sm font-medium text-ink-700">Full name</label>
            <input {...register("name")} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Email</label>
            <input type="email" {...register("email")} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Phone (optional)</label>
            <input {...register("phone")} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </div>
          {role === "PARTNER" && (
            <div>
              <label className="text-sm font-medium text-ink-700">Business name</label>
              <input {...register("businessName")} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-ink-700">Password</label>
            <input type="password" {...register("password")} className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
          {role === "PARTNER" && (
            <p className="text-center text-xs text-ink-400">
              You'll complete your storage location details in the next step.
            </p>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
