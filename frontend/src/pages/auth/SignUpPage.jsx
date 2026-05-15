import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/components/shared/PageShell";
import { readApiResponse } from "@/lib/api";
// If you have a Nav/Footer, import them
// import Footer from "@/components/shared/Footer"; 

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

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
});

export function SignUpPage() {
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const navigate = useNavigate();

  async function onSubmit(values) {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const payload = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(payload?.message || "Sign up failed");
      }

      if (payload?.data?.accessToken) {
        localStorage.setItem("accessToken", payload.data.accessToken);
      }
      if (payload?.data?.refreshToken) {
        localStorage.setItem("refreshToken", payload.data.refreshToken);
      }

      navigate("/dashboard");
    } catch (error) {
      setSubmitError(error.message || "Sign up failed");
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
        {/* Left Column - Hero text */}
        <section className="flex flex-col justify-center border-r-0 border-white/15 px-5 pb-10 pt-28 sm:px-10 lg:border-r lg:px-20 lg:pb-20 lg:pt-20">
          <div>
            <h1 className="mb-6 text-[48px] leading-none tracking-[-0.04em] lg:text-[64px]">
              Join Polly.
              <br />
              Make your voice heard.
            </h1>

            <p className="max-w-100 text-lg font-light text-white/70">
              Create and participate in real-time polls. Fast, anonymous, and beautifully simple.
            </p>
          </div>
          {/* <Footer /> */}
        </section>

        {/* Right Column - Form */}
        <section className="flex flex-col justify-center bg-white/2 px-5 py-10 backdrop-blur-[10px] sm:px-10 lg:px-20 relative">
            
          {/* Absolute positioned Link to switch between Login/Signup */}
          <div className="absolute top-10 right-10 flex items-center gap-2 text-sm text-white/70">
            Already have an account? 
            <Link to="/login" className="text-white hover:underline underline-offset-4">
              Sign In
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-medium mb-8">Create an account</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
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
                      <FormLabel className="text-white/80">Password</FormLabel>
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
                  {isSubmitting ? "Signing Up..." : "Sign Up"}
                </Button>
              </form>
            </Form>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
