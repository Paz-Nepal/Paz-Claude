import * as React from "react";
import { Button, Field, Input, StatePanel, Textarea } from "@paz/ui";
import { toAppError } from "@paz/types";
import { readCommunicationPreferences, useMyProfile, useUpdateMyProfile } from "../api/use-profile";

/**
 * T-085/D-13. api.my_profile / api.update_my_profile have existed since
 * 0005_api_schema.sql with no frontend consumer — this is the self-service
 * surface for both ordinary profile fields and the {dispatch, programs}
 * communication_preferences consent captured at signup/application.
 */
export function AccountPage() {
  const profile = useMyProfile();
  const update = useUpdateMyProfile();

  const [displayName, setDisplayName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [dispatchOptIn, setDispatchOptIn] = React.useState(false);
  const [programsOptIn, setProgramsOptIn] = React.useState(false);

  React.useEffect(() => {
    if (!profile.data) return;
    setDisplayName(profile.data.display_name ?? "");
    setPhone(profile.data.phone ?? "");
    setBio(profile.data.bio ?? "");
    const prefs = readCommunicationPreferences(profile.data.communication_preferences);
    setDispatchOptIn(prefs.dispatch);
    setProgramsOptIn(prefs.programs);
  }, [profile.data]);

  if (profile.isPending) {
    return (
      <div className="max-w-standard mx-auto px-6 py-16">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (profile.isError) {
    return (
      <div className="max-w-standard mx-auto px-6 py-16">
        <StatePanel
          title="Couldn't load your account."
          description={toAppError(profile.error).message}
        />
      </div>
    );
  }

  return (
    <div className="max-w-standard mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">My account</h1>
        <p className="text-muted-foreground">{profile.data?.full_name}</p>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            displayName: displayName.trim() || null,
            phone: phone.trim() || null,
            bio: bio.trim() || null,
            communicationPreferences: { dispatch: dispatchOptIn, programs: programsOptIn },
          });
        }}
      >
        <Field
          label="Display name"
          htmlFor="displayName"
          hint="Shown wherever your name is public."
        >
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" hint="Optional.">
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Bio" htmlFor="bio" hint="Optional.">
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Stay in touch</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dispatchOptIn}
              onChange={(e) => setDispatchOptIn(e.target.checked)}
            />
            Send me the Dispatch by email
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={programsOptIn}
              onChange={(e) => setProgramsOptIn(e.target.checked)}
            />
            Send me programme announcements by email
          </label>
        </fieldset>
        {update.isError && (
          <p role="alert" className="text-destructive text-sm">
            {toAppError(update.error).message}
          </p>
        )}
        {update.isSuccess && <p className="text-sm">Saved.</p>}
        <Button type="submit" loading={update.isPending} className="self-start">
          Save changes
        </Button>
      </form>
    </div>
  );
}
