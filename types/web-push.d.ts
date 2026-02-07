declare module "web-push" {
    export interface PushSubscription {
        endpoint: string;
        expirationTime?: number | null;
        keys: {
            p256dh: string;
            auth: string;
        };
    }

    export interface RequestOptions {
        TTL?: number;
        vapidDetails?: VapidDetails;
        headers?: Record<string, string>;
        contentEncoding?: string;
        timeout?: number;
        proxy?: string;
        agent?: unknown;
        urgency?: "very-low" | "low" | "normal" | "high";
        topic?: string;
    }

    export interface VapidDetails {
        subject: string;
        publicKey: string;
        privateKey: string;
    }

    export interface VapidKeys {
        publicKey: string;
        privateKey: string;
    }

    export interface SendResult {
        statusCode: number;
        body: string;
        headers: Record<string, string>;
    }

    export interface WebPushError extends Error {
        statusCode: number;
        body: string;
        headers: Record<string, string>;
        endpoint: string;
    }

    export function setVapidDetails(
        subject: string,
        publicKey: string,
        privateKey: string
    ): void;

    export function generateVAPIDKeys(): VapidKeys;

    export function setGCMAPIKey(apiKey: string): void;

    export function sendNotification(
        subscription: PushSubscription,
        payload?: string | Buffer | null,
        options?: RequestOptions
    ): Promise<SendResult>;

    export function generateRequestDetails(
        subscription: PushSubscription,
        payload?: string | Buffer | null,
        options?: RequestOptions
    ): {
        method: string;
        headers: Record<string, string>;
        body: Buffer;
        endpoint: string;
    };

    export function encrypt(
        userPublicKey: string,
        userAuth: string,
        payload: string | Buffer,
        contentEncoding?: string
    ): {
        localPublicKey: string;
        salt: string;
        cipherText: Buffer;
    };

    export function getVapidHeaders(
        audience: string,
        subject: string,
        publicKey: string,
        privateKey: string,
        contentEncoding?: string,
        expiration?: number
    ): {
        Authorization: string;
        "Crypto-Key": string;
    };

    const webPush: {
        setVapidDetails: typeof setVapidDetails;
        generateVAPIDKeys: typeof generateVAPIDKeys;
        setGCMAPIKey: typeof setGCMAPIKey;
        sendNotification: typeof sendNotification;
        generateRequestDetails: typeof generateRequestDetails;
        encrypt: typeof encrypt;
        getVapidHeaders: typeof getVapidHeaders;
    };

    export default webPush;
}
