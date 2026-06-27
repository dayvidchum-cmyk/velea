export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Where to send an unauthenticated user. This app uses its own email/password
 * auth (see /login), so we route to the in-app login page in every environment.
 * The legacy Manus OAuth portal redirect has been removed.
 */
export const getLoginUrl = () => "/login";
