"use client";

import { Button } from "@/components/ui/button";
import { useSignIn } from "@clerk/nextjs";
import { type OAuthStrategy } from "@clerk/types";

function OauthSignIn() {
  const { signIn } = useSignIn();

  if (!signIn) return null;

  const signInWith = async (strategy: OAuthStrategy) => {
    return signIn
      .authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: "/",
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err: any) => {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        console.log(err.errors);
        console.error(err, null, 2);
      });
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div className="w-full max-w-xs">
        <Button
          className="h-12 w-full shadow-[0_0_36px_rgba(59,130,246,0.9)] transition-shadow duration-500 hover:cursor-pointer hover:shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          variant="outline"
          onClick={() => signInWith("oauth_google")}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

export default function CustomSignUp() {
  return <OauthSignIn />;
}
