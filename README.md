# Barcode-inventory-web

A Java 21 Spring Boot web application that scans barcodes using the device camera and stores inventory locally in the browser.

## Run locally

```bash
mvn spring-boot:run
```

Open `http://localhost:8080`.

## Keep-alive ping for Render

If you deploy to a platform that may go idle, this repository includes:

- `scripts/keep-alive.ps1`: sends a GET request to your deployed app
- `.github/workflows/keep-alive.yml`: runs every 10 minutes in GitHub Actions

To enable it:

1. Push this repository to GitHub.
2. Go to `Settings > Secrets and variables > Actions > Variables`.
3. Create a repository variable named `KEEP_ALIVE_URL`.
4. Set it to your public app URL, for example:

```text
https://your-app.onrender.com
```

You can also trigger the workflow manually from the `Actions` tab.
