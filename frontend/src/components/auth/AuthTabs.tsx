import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { OAuthTab } from './OAuthTab'

export function AuthTabs() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authorization</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="oauth">
          <TabsList>
            <TabsTrigger value="oauth">OAuth</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth">
            <OAuthTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
