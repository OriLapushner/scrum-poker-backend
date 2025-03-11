#!/bin/bash
set -e

DOMAIN_NAME="${DOMAIN_NAME:?Missing required environment variable DOMAIN_NAME}"
ADDITIONAL_DOMAINS="${ADDITIONAL_DOMAINS:-}"
EMAIL_ADDRESS="${EMAIL_ADDRESS:?Missing required environment variable EMAIL_ADDRESS}"
SECRET_NAME="${SECRET_NAME:?Missing required environment variable SECRET_NAME}"
AWS_SERVICES_REGION="${AWS_SERVICES_REGION:?Missing required environment variable AWS_SERVICES_REGION}"
IS_STAGING="${IS_STAGING:-false}"
CERTBOT_PATH="/tmp/certbot"
CERT_PATH="/tmp/letsencrypt"
LOGS_PATH="/tmp/logs"

mkdir -p "$CERTBOT_PATH" "$CERT_PATH" "$LOGS_PATH"

echo "Starting certificate issuance/renewal for $DOMAIN_NAME..."

echo "Installing dependencies..."
pip install certbot certbot-dns-route53 awscli -t "$CERTBOT_PATH" > "$LOGS_PATH/pip_install.log" 2>&1

export PATH="$CERTBOT_PATH/bin:$PATH"
export PYTHONPATH="$CERTBOT_PATH:$PYTHONPATH"

DOMAIN_PARAMS="-d $DOMAIN_NAME"
if [ -n "$ADDITIONAL_DOMAINS" ]; then
  IFS=',' read -ra DOMAINS <<< "$ADDITIONAL_DOMAINS"
  for domain in "${DOMAINS[@]}"; do
    DOMAIN_PARAMS="$DOMAIN_PARAMS -d $domain"
  done
fi

STAGING_PARAM=""
if [ "$IS_STAGING" = "true" ]; then
  STAGING_PARAM="--staging"
  echo "Running in staging mode"
fi

echo "Running Certbot with Route 53 plugin..."
certbot certonly \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL_ADDRESS" \
  --dns-route53 \
  $DOMAIN_PARAMS \
  $STAGING_PARAM \
  --work-dir "$CERTBOT_PATH" \
  --logs-dir "$LOGS_PATH" \
  --config-dir "$CERT_PATH" \
  > "$LOGS_PATH/certbot.log" 2>&1

# Check if certificates were successfully obtained
if [ ! -d "$CERT_PATH/live/$DOMAIN_NAME" ]; then
  echo "Certificate issuance failed. Check the logs for details."
  cat "$LOGS_PATH/certbot.log"
  exit 1
fi

echo "Storing certificates in AWS Secrets Manager..."

CERT_BODY=$(cat "$CERT_PATH/live/$DOMAIN_NAME/cert.pem")
CERT_CHAIN=$(cat "$CERT_PATH/live/$DOMAIN_NAME/chain.pem")
PRIVATE_KEY=$(cat "$CERT_PATH/live/$DOMAIN_NAME/privkey.pem")
FULLCHAIN=$(cat "$CERT_PATH/live/$DOMAIN_NAME/fullchain.pem")

SECRET_JSON=$(cat <<EOF
{
  "certificate": $(printf %q "$CERT_BODY"),
  "chain": $(printf %q "$CERT_CHAIN"),
  "fullchain": $(printf %q "$FULLCHAIN"),
  "privkey": $(printf %q "$PRIVATE_KEY"),
  "domain": "$DOMAIN_NAME",
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)

# Check if secret already exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_SERVICES_REGION" > /dev/null 2>&1; then
  echo "Updating existing secret: $SECRET_NAME"
  aws secretsmanager update-secret \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_SERVICES_REGION"
else
  echo "Creating new secret: $SECRET_NAME"
  aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "SSL certificate for $DOMAIN_NAME" \
    --secret-string "$SECRET_JSON" \
    --region "$AWS_SERVICES_REGION"
fi

echo "Certificate processing completed successfully!"
echo "Certificates are stored in AWS Secrets Manager: $SECRET_NAME"

rm -rf "$CERTBOT_PATH" "$CERT_PATH" "$LOGS_PATH"
echo "Cleanup completed."

exit 0