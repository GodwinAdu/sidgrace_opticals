"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import Link from "next/link"
import { Eye, EyeOff, Loader2, LogInIcon } from "lucide-react"
import { toast } from "sonner"
import { loginStaff } from "@/lib/actions/staff.actions"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"


const formSchema = z.object({
    username: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    password: z.string().min(6, {
        message: "Password must minimum of six"
    }),
    rememberMe: z.boolean()
})
export function LoginForm() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            rememberMe: false
        },
    });

    const { isSubmitting, isValid } = form.formState;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // Trim to avoid stray whitespace (e.g. autofill/paste) breaking auth
            await loginStaff({
                ...values,
                username: values.username.trim(),
                password: values.password.trim(),
            })
            router.push("/dashboard")
            toast.success("Login in success", {
                description: "you've login successfully"
            })

        } catch (error) {
            console.log("something went wrong ", error)
            toast.error("Something went wrong", {
                description: "Please try again later",
            })
        }
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Login to your account</h1>
                    <p className="text-balance text-sm text-muted-foreground">
                        Enter your username below to login
                    </p>
                </div>
                <div className="grid gap-6">
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter username" {...field} />
                                </FormControl>

                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center">
                                    <FormLabel>Password</FormLabel>
                                    <Link
                                        href="/forgot_password"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="*********"
                                            className="pr-10"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            disabled={isSubmitting}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            aria-pressed={showPassword}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </FormControl>

                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="rememberMe"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Remember me</FormLabel>
                                    <FormDescription>Stay logged in on this device</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                    <Button disabled={!isValid || isSubmitting} type="submit" className="w-full">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogInIcon className="w-4 h-4 " />}
                        {isSubmitting ? "Please wait ..." : "Sign In"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
