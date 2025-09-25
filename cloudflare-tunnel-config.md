# Cloudflare Tunnels Configuration Guide

This guide will help you configure Cloudflare tunnels to make your portfolio accessible via your custom domain.

## Architecture

- **Main Site**: `my-domain.com` → `localhost:3003` (Portfolio Site)
- **Admin Portal**: `admin.my-domain.com` → `localhost:6900` (Admin Interface)

## Cloudflare Tunnel Configuration

### 1. Install cloudflared

```bash
# Download and install cloudflared on your VM
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

### 2. Create Tunnel Configuration File

Create a file named `tunnel-config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/your/tunnel/credentials.json

ingress:
  # Admin subdomain
  - hostname: admin.my-domain.com
    service: http://localhost:6900
    
   # Main domain
   - hostname: my-domain.com
      service: http://localhost:3003
    
  # Catch-all rule (required)
  - service: http_status:404
```

### 3. Cloudflare Dashboard Configuration

In your Cloudflare dashboard:

1. **Create a tunnel**:
   - Go to Zero Trust > Access > Tunnels
   - Click "Create a tunnel"
   - Name it (e.g., "portfolio-tunnel")
   - Save the tunnel ID and credentials file

2. **Configure DNS records**:
   - Add CNAME record: `my-domain.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`
   - Add CNAME record: `admin.my-domain.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`

3. **Set up Public Hostnames**:
   - Subdomain: `admin`, Domain: `my-domain.com`, Service: `http://localhost:6900`
   - Subdomain: (leave empty), Domain: `my-domain.com`, Service: `http://localhost:3003`

### 4. Alternative: Using CLI Commands

If you prefer using CLI commands instead of the dashboard:

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create portfolio-tunnel

# Configure DNS
cloudflared tunnel route dns portfolio-tunnel my-domain.com
cloudflared tunnel route dns portfolio-tunnel admin.my-domain.com

# Run tunnel
cloudflared tunnel --config tunnel-config.yml run portfolio-tunnel
```

### 5. Run as System Service

Create a systemd service file `/etc/systemd/system/cloudflared.service`:

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --config /path/to/tunnel-config.yml run portfolio-tunnel
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Security Considerations

### 1. Admin Portal Protection

The admin portal will be accessible via `admin.my-domain.com`. Consider adding additional security:

1. **Cloudflare Access** (Recommended):
   - Go to Zero Trust > Access > Applications
   - Create a new application for `admin.my-domain.com`
   - Set up authentication policies (email, Google, etc.)

2. **IP Restrictions**:
   - In Cloudflare, go to Security > WAF
   - Create rules to restrict admin access to specific IPs

### 2. SSL/TLS

Cloudflare automatically provides SSL certificates. Ensure:
- SSL/TLS encryption mode is set to "Full" or "Full (strict)"
- HTTP requests are redirected to HTTPS

## Testing

After configuration:

1. **Test main site**: Visit `https://my-domain.com`
2. **Test admin portal**: Visit `https://admin.my-domain.com`
3. **Verify functionality**: 
   - Image uploads work
   - API calls work between admin and data storage
   - All features function as expected

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**: Check if your Docker containers are running on the correct ports
2. **DNS propagation**: Allow up to 24 hours for DNS changes to propagate
3. **Certificate errors**: Ensure Cloudflare SSL is properly configured

### Debug Commands:

```bash
# Check tunnel status
cloudflared tunnel info portfolio-tunnel

# View tunnel logs
sudo journalctl -u cloudflared -f

# Test local services
curl http://localhost:3003  # Test main site
curl http://localhost:6900  # Test admin portal
```

## Environment Variables

No changes needed to your existing environment variables. The applications will work with any domain since they use relative URLs for internal API calls.

## File Changes Made

The following files were updated to support domain configuration:

### `/apps/site/src/components/Hero.astro`
- **Fixed**: Profile photo now uses high-quality URLs automatically
- **Added**: Function to detect and convert to high-quality image URLs

## Notes

- Your existing Docker setup is already compatible with Cloudflare tunnels
- No code changes are needed beyond the profile photo fix
- All API calls use relative URLs, so they'll work with any domain
- Data persistence is maintained through Docker volumes

## Next Steps

1. Replace `my-domain.com` with your actual domain name
2. Follow the Cloudflare tunnel setup process
3. Test both sites after configuration
4. Consider implementing Cloudflare Access for admin portal security