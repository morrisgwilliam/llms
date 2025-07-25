import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


const NWS_API_BASE = "https://api.weather.gov"
const USER_AGENT = "weather-app/1.0";

const server = new McpServer({
    name: "weather",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {}
    }
})

const makeNWSRequest = async <T>(url: string): Promise<T | null> => {
    const headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }

    try {
        const response = await fetch(url, { headers })
        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making request:", error);
        return null;
    }
}

interface AlertFeature {
    properties: {
        event?: string
        areaDesc?: string
        severity?: string
        status?: string
        headline?: string
    }
}

const formatAlert = (feature: AlertFeature): string => {
    const { properties } = feature;
    return [
       `Event: ${properties.event || "Unkown"}`,
       `Area: ${properties.areaDesc || "Unkown"}`,
       `Severity: ${properties.severity || "Unkown"}`,
       `Status: ${properties.status || "Unkown"}`,
       `Headline: ${properties.headline || "Unkown"}`,
       `---`,
    ].join("\n");
}

interface ForecastPeriod {
    name?: string;
    temperature?: number;
    temperatureUnit?: string;
    windSpeed?: string;
    windDirection?: string;
    shortForecast?: string;
  }
  
  interface AlertsResponse {
    features: AlertFeature[];
  }
  
  interface PointsResponse {
    properties: {
      forecast?: string;
    };
  }
  
  interface ForecastResponse {
    properties: {
      periods: ForecastPeriod[];
    };
  }

  server.tool(
    "get_alerts",
    "Get weather alerts for a state",
    {
        state: z.string().length(2).describe("Two letter state code (e.g. CA, NY)"),
    },
    async({ state }) => {
        const stateCode = state.toUpperCase();
        const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
        const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

        if(!alertsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No alerts found for state ${stateCode}.`
                    }
                ]
            }
        }

        const features = alertsData.features || [];

        if(!features.length) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No alerts found for state ${stateCode}.`
                    }
                ]
            }
        }

        const formattedAlerts = features.map(formatAlert);
        const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`

        return {
            content: [
                {
                    type: "text",
                    text: alertsText
                }
            ]
        }
    }
  )

  server.tool(
    "get_forecast",
    "Get weather forecast for a state",
    {
        latitude: z
            .number()
            .min(-90)
            .max(90)
            .describe("Latitude of the location"),
        longitude: z
            .number()
            .min(-180)
            .max(180)
            .describe("Longitude of the location"),
    },
    async ({ latitude, longitude }) => {
        const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

        if(!pointsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No forecast data available for the specified location."
                    }
                ]
            }
        }

        const forecastUrl = pointsData.properties.forecast;

        if(!forecastUrl) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No forecast URL available for the specified location."
                    }
                ]
            }
        }

        const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
        if (!forecastData) {
          return {
            content: [
              {
                type: "text",
                text: "Failed to retrieve forecast data",
              },
            ],
          };
        }

        const periods = forecastData.properties?.periods || [];
        if (periods.length === 0) {
            return {
                content: [
                {
                    type: "text",
                    text: "No forecast periods available",
                },
                ]
            }
        }

        const formattedForecast = periods.map((period) => [
            `${period.name || "Unknown Period"}:`,
            `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
            `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
            `${period.shortForecast || "No forecast available"}`,
            `---`
        ].join("\n"))

        const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

        return {
            content: [
                {
                    type: "text",
                    text: forecastText
                }
            ]
        }
    })

const main = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}
    
main()
.catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});