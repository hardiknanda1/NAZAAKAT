import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { currentConsultant } from "@/lib/consultantAuth";
import { consultantHelp } from "@/lib/site";
import { CONSULTANT_PHOTO_BUCKET, signedUrls } from "@/lib/supabase";
import ConsultantLogin from "../ConsultantLogin";
import PasswordSection from "./PasswordSection";
import ProfileForm from "./ProfileForm";

async function Profile({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  await connection();
  const consultant = await currentConsultant();
  if (!consultant) return <ConsultantLogin {...consultantHelp()} />;
  const welcome = (await searchParams).welcome === "1";
  const photoUrl = consultant.photo_path
    ? ((await signedUrls(CONSULTANT_PHOTO_BUCKET, [consultant.photo_path]).catch(() => ({}) as Record<string, string>))[consultant.photo_path] ?? null)
    : null;

  return (
    <div className="container-x max-w-3xl py-12">
      <Link href="/consultant" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate">
        <ArrowLeft size={16} aria-hidden /> Your consultations
      </Link>
      <h1 className="mt-4 font-serif text-5xl font-medium text-charcoal">Your profile</h1>
      {welcome && (
        <p className="mt-3 text-lg text-muted">Welcome to NAZAAKAT! Your account is ready. Tell us a little about yourself so we can match you with the right clients.</p>
      )}
      <div className="mt-10 space-y-10">
        {!consultant.password_hash && <PasswordSection hasPassword={Boolean(consultant.password_hash)} highlight={!consultant.password_hash} />}
        <ProfileForm
          email={consultant.email}
          photoUrl={photoUrl}
          initial={{
            name: consultant.name,
            phone: consultant.phone ? `+${consultant.phone}` : "",
            expertise: consultant.expertise ?? [],
            years_experience: consultant.years_experience == null ? "" : String(consultant.years_experience),
            languages: consultant.languages ?? [],
            city: consultant.city ?? "",
            bio: consultant.bio ?? "",
            portfolio_url: consultant.portfolio_url ?? "",
          }}
        />
        {consultant.password_hash && <PasswordSection hasPassword highlight={false} />}
      </div>
    </div>
  );
}

export default function ProfilePage(props: { searchParams: Promise<{ welcome?: string }> }) {
  return (
    <Suspense fallback={<p className="container-x py-16 text-lg text-muted">Loading…</p>}>
      <Profile searchParams={props.searchParams} />
    </Suspense>
  );
}
