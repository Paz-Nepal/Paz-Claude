import * as React from "react";
import { Button, Field, Input, Textarea, StatePanel } from "@paz/ui";
import { toAppError } from "@paz/types";
import { useRequestReservation } from "../api/use-hospitality";

export function ReservationPage() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [partySize, setPartySize] = React.useState("2");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [occasion, setOccasion] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const request = useRequestReservation();

  const canSubmit = fullName.trim() && date && time && Number(partySize) >= 1;

  return (
    <div className="max-w-reading mx-auto flex flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl">Reserve a table</h1>
        <p className="text-muted-foreground">
          A person confirms every reservation — expect a reply, not an instant confirmation.
        </p>
      </header>

      {request.isSuccess ? (
        <StatePanel
          title="Request sent."
          description={`Your reservation code is ${request.data}. We'll be in touch to confirm.`}
        />
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            const startsAt = new Date(`${date}T${time}`).toISOString();
            request.mutate({
              fullName,
              email: email || null,
              phone: phone || null,
              partySize: Number(partySize),
              startsAt,
              durationMinutes: 90,
              notes: notes || null,
              occasion: occasion || null,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="res-name">
              <Input id="res-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Party size" htmlFor="res-party">
              <Input
                id="res-party"
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="res-email">
              <Input
                id="res-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="res-phone">
              <Input id="res-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Date" htmlFor="res-date">
              <Input
                id="res-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Time" htmlFor="res-time">
              <Input
                id="res-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Occasion" htmlFor="res-occasion" hint="Optional.">
            <Input
              id="res-occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />
          </Field>
          <Field
            label="Notes"
            htmlFor="res-notes"
            hint="Dietary needs, seating preference, anything else."
          >
            <Textarea
              id="res-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          {request.isError && (
            <p role="alert" className="text-destructive text-sm">
              {toAppError(request.error).message}
            </p>
          )}
          <Button
            type="submit"
            loading={request.isPending}
            disabled={!canSubmit}
            className="self-start"
          >
            Request reservation
          </Button>
        </form>
      )}
    </div>
  );
}
