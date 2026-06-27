# Background Fix Observation

The background image is now on the `.container` div (same as Home.tsx), which constrains its width and prevents the extreme zoom/pixelation. The image now appears at the same scale as the Today page.

However, I notice the day panel is showing "No panchang data for this date" instead of the Build mode card. This might be because the selected date changed or a rendering issue. Need to click on today's date (30) to verify.

Also, the background now only covers the container area, and below it is black — which matches the Today page behavior. This is correct.
