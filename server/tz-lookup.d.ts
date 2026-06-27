declare module "tz-lookup" {
  /** Returns the IANA timezone name for a lat/lon (nearest match). */
  function tzlookup(lat: number, lon: number): string;
  export default tzlookup;
}
