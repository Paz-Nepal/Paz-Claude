import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export const Basic = () => (
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle>The Hearth</CardTitle>
      <CardDescription>A quiet room for reading, kept as it always has been.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm">Open daily, 9am–6pm.</p>
    </CardContent>
  </Card>
);
