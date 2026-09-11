import { analytics } from "../../state";
import { applyAnalyticsOrientation } from "./applyAnalyticsOrientation";

export function flipAnalytics(): void {
    analytics.rotation = (analytics.rotation + 90) % 360;
    applyAnalyticsOrientation();
}
