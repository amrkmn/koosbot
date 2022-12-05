import { ApplyOptions } from "@sapphire/decorators";
import { DurationFormatter } from "@sapphire/duration";
import { ApiRequest, ApiResponse, methods, Route } from "@sapphire/plugin-api";

const formatter = new DurationFormatter();
@ApplyOptions<Route.Options>({ route: `` })
export class UserRoute extends Route {
    public [methods.GET](_request: ApiRequest, response: ApiResponse) {
        const uptime = formatter.format(this.container.client.uptime!);

        response.json({ message: `Landing page for ${this.container.client.user?.tag}`, uptime });
    }

    public [methods.POST](_request: ApiRequest, response: ApiResponse) {
        const uptime = formatter.format(this.container.client.uptime!);

        response.json({ message: `Landing page for ${this.container.client.user?.tag}`, uptime });
    }
}
