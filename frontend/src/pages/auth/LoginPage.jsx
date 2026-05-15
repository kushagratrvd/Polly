import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/components/shared/PageShell";
import { readApiResponse } from "@/lib/api";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export function LoginPage() {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  async function onSubmit(values) {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const payload = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Login failed");
      }

      if (payload?.data?.accessToken) {
        localStorage.setItem("accessToken", payload.data.accessToken);
      }
      if (payload?.data?.refreshToken) {
        localStorage.setItem("refreshToken", payload.data.refreshToken);
      }

      navigate("/dashboard");
    } catch (error) {
      setSubmitError(error.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      overlayOpacity={0.92}
      className="lg:h-screen lg:overflow-hidden bg-black text-white"
      bgCover={true}
      bgIndex={0}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left Column */}
        <section className="flex flex-col justify-center border-r-0 border-white/15 px-5 pb-10 pt-28 sm:px-10 lg:border-r lg:px-20 lg:pb-20 lg:pt-20">
          <div>
            <h1 className="mb-6 text-[48px] leading-none tracking-[-0.04em] lg:text-[64px]">
              Welcome back.
            </h1>
            <p className="max-w-100 text-lg font-light text-white/70">
              Sign in to manage your active polls, view results, and vote in private sessions.
            </p>
          </div>
        </section>

        {/* Right Column */}
        <section className="flex flex-col justify-center bg-white/2 px-5 py-10 backdrop-blur-[10px] sm:px-10 lg:px-20 relative">
            
          <div className="absolute top-10 right-10 flex items-center gap-2 text-sm text-white/70">
            Don't have an account? 
            <Link to="/signup" className="text-white hover:underline underline-offset-4">
              Sign Up
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-medium mb-8">Sign in to your account</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="you@example.com" 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-white/80">Password</FormLabel>
                        
                        <Link to="#" className="text-xs text-white/50 hover:text-white">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                {submitError ? (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {submitError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full h-12 mt-4 bg-white text-black hover:bg-white/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
