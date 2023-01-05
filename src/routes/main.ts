import { ApplyOptions } from "@sapphire/decorators";
import { DurationFormatter } from "@sapphire/duration";
import { ApiRequest, ApiResponse, methods, Route } from "@sapphire/plugin-api";
import { readFileSync } from "fs";
import { resolve } from "path";

const formatter = new DurationFormatter();
const version = Reflect.get(JSON.parse(readFileSync(resolve(process.cwd(), "package.json")).toString()), "version");
@ApplyOptions<Route.Options>({ route: `` })
export class UserRoute extends Route {
    public [methods.GET](_request: ApiRequest, response: ApiResponse) {
        const uptime = formatter.format(this.container.client.uptime!);

        response.json({ message: `Landing page for ${this.container.client.user?.tag}`, uptime, version });
    }

    public [methods.POST](_request: ApiRequest, response: ApiResponse) {
        const uptime = formatter.format(this.container.client.uptime!);

        response.json({ message: `Landing page for ${this.container.client.user?.tag}`, uptime, version });
    }
}
