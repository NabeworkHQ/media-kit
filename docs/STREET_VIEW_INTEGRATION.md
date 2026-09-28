# Google Street View lead-in

A `vr-tour` item can optionally declare a `streetView` entry. When present,
the visitor sees a real Street View panorama they can look around in first,
with a "Step inside" button that transitions into the indoor 3D model or
panorama tour - the same UX pattern used by many real-estate listing sites
(walk up the street, then step through the front door into the walkthrough).

```ts
{
  id: "123-main-st",
  type: "vr-tour",
  scene: { kind: "model3d", item: { src: "https://.../scan.glb" } },
  streetView: {
    apiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    position: { lat: 40.7580, lng: -73.9855 },
    pov: { heading: 90, pitch: 0, zoom: 1 },
    enterLabel: { en: "Step inside", es: "Entrar" },
  },
}
```

## Setup

1. In Google Cloud Console, enable the **Maps JavaScript API** for your
   project and create an API key.
2. Restrict the key (HTTP referrer restriction to your tenant domains is
   strongly recommended - this key is used client-side).
3. Billing must be enabled on the GCP project; Street View panorama loads
   are billed per Google's Maps Platform pricing. Because the kit only
   loads the Maps JS API when a `vr-tour` item actually has a `streetView`
   entry, tenants who don't use this feature incur no cost or extra bundle
   weight.
4. Pass the key per-item (`streetView.apiKey`), not globally - this lets a
   multi-tenant deployment use a different key/billing project per
   organization if needed. In practice most integrations will read this
   from the tenant's settings and pass the same key for every listing.

## What `StreetViewBridge` does

- Lazily injects the `https://maps.googleapis.com/maps/api/js` script tag
  exactly once per page (cached across multiple `vr-tour` items).
- Renders a `google.maps.StreetViewPanorama` at the given
  `position`/`pov`, with Google's default navigation controls (drag to
  look around, click the arrows on the road to move along the street).
- Shows an "Step inside" button; clicking it tears down the Street View
  panorama and mounts the indoor scene (3D model or panorama tour) in its
  place.
- **Fails soft**: if the Maps JS API can't load (bad key, network, ad
  blocker, no billing), the bridge logs the error and immediately falls
  through to the indoor tour instead of leaving the visitor stuck on a
  broken screen.

## Choosing a `position`

`position` should be a point on or very near the street with a good Street
View panorama available - not necessarily the exact property coordinates
(Google's imagery may not have a panorama photographed from inside the lot
line). A good default is the coordinate returned by a geocoding lookup on
the listing's street address; verify coverage once per property using
Google's [Street View coverage
checker](https://maps.google.com/) rather than assuming every address has
imagery.

## Limitations / things this does *not* do

- There's no automatic alignment between the Street View camera's final
  heading and the indoor scene's starting orientation - if you want the
  transition to feel seamless (facing the same direction after "stepping
  inside"), set the indoor scene's initial camera/waypoint heading to
  roughly match `pov.heading`.
- This is a hard cut between two panoramas/scenes, not a blended
  photogrammetry transition. True door-to-door blending would require
  either custom-captured entry imagery or a third-party service; this
  bridge intentionally keeps to the well-supported, low-maintenance
  integration (official widget + a UI transition) rather than attempting
  to reverse-engineer Street View's raw imagery.
