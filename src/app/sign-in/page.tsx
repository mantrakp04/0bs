import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <SignInButton>
        <Button size="lg" className="cursor-pointer text-lg" variant="outline">
          Sign in with Google
        </Button>
      </SignInButton>
    </div>
  );
}
