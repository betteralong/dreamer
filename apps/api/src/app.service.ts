import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      ok: true,
      service: "dreamer-api",
      timestamp: new Date().toISOString(),
    };
  }
}
