import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wallet, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  // Inline auth messaging for beginner-friendly UX
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "reset") {
      setIsResetMode(true);
      setIsLogin(false);
      return;
    }
    setIsResetMode(false);
    setIsLogin(mode !== "signup");
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isResetMode) {
      if (!resetPassword || resetPassword !== confirmResetPassword) {
        setErrorMessage("Passwords do not match");
        return;
      }

      setErrorMessage("");
      setSuccessMessage("");
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: resetPassword });
        if (error) {
          setErrorMessage(error.message || "Password reset failed");
          return;
        }
        setSuccessMessage("Password updated. You can now sign in with your new password.");
        setIsResetMode(false);
        setIsLogin(true);
        setResetPassword("");
        setConfirmResetPassword("");
      } catch (err) {
        setErrorMessage("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Clear any previous messages when submitting
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      if (isLogin) {
        // SIGN IN: email/password via Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Generic invalid credentials message
          setErrorMessage("Invalid email or password");
          return;
        }

        toast.success("Welcome back!");
        const pendingName = localStorage.getItem("pendingProfileName");
        if (pendingName) {
          try {
            await api.updateProfile({ name: pendingName });
            localStorage.removeItem("pendingProfileName");
          } catch (profileError) {
            // If profile update fails, allow login to proceed.
          }
        }
        navigate("/dashboard");
      } else {
        // SIGN UP: create account with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        // Supabase returns an error when the email is already registered.
        // In some cases (e.g., email confirmation pending), `error` can be null
        // but `data.user.identities` will be empty, which also indicates the user exists.
        const userExists = data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;

        if (error || userExists) {
          const msg = (error?.message || "").toLowerCase();
          const isAlreadyRegistered = msg.includes("already registered") || error?.status === 400 || userExists;

          if (isAlreadyRegistered) {
            // Strict duplicate handling: do not register again; stay on Sign Up and show error
            setErrorMessage("This email is already registered. Please Sign in instead.");
            return;
          }

          setErrorMessage(error?.message || "Sign up failed");
          return;
        }

        // Success: account created; guide user to verify email before sign-in
        if (formData.name) {
          if (data?.session?.access_token) {
            try {
              await api.updateProfile({ name: formData.name });
            } catch (profileError) {
              // Defer profile update if it cannot be completed now.
              localStorage.setItem("pendingProfileName", formData.name);
            }
          } else {
            localStorage.setItem("pendingProfileName", formData.name);
          }
        }
        setSuccessMessage(
          "Account created successfully! Please check your email and confirm your sign-up before logging in. Your name will be saved after your first sign-in."
        );
        // Keep user on sign-up view; they can switch to Sign In after confirming
      }
    } catch (err) {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrorMessage("Enter your email to reset your password");
      toast.error("Please enter your email first");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        setErrorMessage(error.message || "Unable to send reset link");
        toast.error("Unable to send reset link");
        return;
      }
      setSuccessMessage("Password reset link sent. Please check your email.");
      toast.success("Reset email sent");
    } catch (err) {
      setErrorMessage("Unable to send reset link. Please try again.");
      toast.error("Unable to send reset link");
    }
  };

  const handleGoogleAuth = async () => {
    // Prevent concurrent flows
    if (isOAuthLoading || isLoading) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsOAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setErrorMessage(error.message || "Google sign-in failed");
      }
      // On success, Supabase will handle the redirect
    } catch (err) {
      setErrorMessage("Google sign-in failed. Please try again.");
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Clear messages when switching modes
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] gradient-emerald relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        
        <div className="relative z-10 px-12 pt-24 pb-16 flex flex-col min-h-screen">
          <div className="space-y-8 max-w-lg">
            <Link to="/" className="flex items-center gap-2 text-primary-foreground mb-12 hover:text-primary-foreground/80 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-primary-foreground">WealthWise</span>
            </div>
            
            <h1 className="text-3xl font-bold text-primary-foreground leading-tight">
              Take Control of Your Financial Future
            </h1>
            
            <p className="text-primary-foreground/90 text-base leading-relaxed" style={{lineHeight: '1.7'}}>
              A comprehensive personal finance management system designed to help you track expenses, 
              manage budgets, and achieve your financial goals efficiently.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-start justify-center p-6 lg:px-12 lg:pt-16 lg:pb-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-muted-foreground mb-8 hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">WealthWise</span>
          </div>

          <Card variant="flat" className="border-0 shadow-none bg-transparent">
            <CardHeader className="space-y-3 px-0 pb-8">
              <CardTitle className="text-3xl font-bold tracking-tight">
                {isResetMode ? "Reset password" : isLogin ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed" style={{lineHeight: '1.6'}}>
                {isResetMode
                  ? "Enter a new password for your account"
                  : isLogin 
                    ? "Enter your credentials to access your account" 
                    : "Enter your details to get started with WealthWise"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && !isResetMode && (
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="pl-11 h-12"
                        variant="emerald"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                {!isResetMode && (
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-11 h-12"
                        variant="emerald"
                        required
                      />
                    </div>
                  </div>
                )}

                {!isResetMode && (
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-11 pr-11 h-12"
                        variant="emerald"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {!isLogin && !isResetMode && (
                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-11 pr-11 h-12"
                        variant="emerald"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {isResetMode && (
                  <>
                    <div className="space-y-2.5">
                      <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="pl-11 pr-11 h-12"
                          variant="emerald"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="confirmNewPassword" className="text-sm font-medium">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="confirmNewPassword"
                          name="confirmNewPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          className="pl-11 pr-11 h-12"
                          variant="emerald"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {isLogin && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground/90 pt-2">
                    <Lock className="w-3.5 h-3.5 text-primary/70" />
                    Your data is securely encrypted
                  </p>
                )}

                {/* Inline auth feedback */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700" role="alert">{errorMessage}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700" role="status">{successMessage}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="hero" 
                  className="w-full h-12 text-base font-medium mt-6" 
                  disabled={isLoading}
                >
                  {isLoading
                    ? isResetMode
                      ? "Updating..."
                      : isLogin
                        ? "Signing in..."
                        : "Creating account..."
                    : isResetMode
                      ? "Update Password"
                      : isLogin
                        ? "Sign In"
                        : "Create Account"}
                </Button>

                {!isResetMode && (
                  <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-muted-foreground font-medium">Or continue with</span>
                  </div>
                  </div>
                )}

                {!isResetMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 text-base"
                    onClick={handleGoogleAuth}
                    disabled={isOAuthLoading || isLoading}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {isOAuthLoading ? "Connecting..." : "Continue with Google"}
                  </Button>
                )}
              </form>

              {!isResetMode && (
                <div className="mt-10 pt-6 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-primary hover:underline font-semibold"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}