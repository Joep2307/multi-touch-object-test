import { analytics } from "../../state/analytics";
import { applyAnalyticsOrientation } from "./applyAnalyticsOrientation";

export function flipAnalytics(): void {
    analytics.rotation = (analytics.rotation + 90) % 360;
    applyAnalyticsOrientation();
}
