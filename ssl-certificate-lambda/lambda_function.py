#!/usr/bin/env python3
import os
import json
import subprocess
import datetime
import shutil
import boto3
from pathlib import Path

def lambda_handler(event, context):
    try:
        DOMAIN_NAME = os.environ.get('DOMAIN_NAME')
        ADDITIONAL_DOMAINS = os.environ.get('ADDITIONAL_DOMAINS', '')
        EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS')
        SECRET_NAME = os.environ.get('SECRET_NAME')
        AWS_SERVICES_REGION = os.environ.get('AWS_SERVICES_REGION')
        IS_STAGING = os.environ.get('IS_STAGING', 'false').lower() == 'true'
        
        for var_name in ['DOMAIN_NAME', 'EMAIL_ADDRESS', 'SECRET_NAME', 'AWS_SERVICES_REGION']:
            if not locals()[var_name]:
                print(f"Missing required environment variable {var_name}")
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f"Missing required environment variable {var_name}"})
                }
        
        CERTBOT_PATH = Path("/tmp/certbot")
        CERT_PATH = Path("/tmp/letsencrypt")
        LOGS_PATH = Path("/tmp/logs")
        
        for directory in [CERTBOT_PATH, CERT_PATH, LOGS_PATH]:
            directory.mkdir(exist_ok=True)
        
        def log_to_file(message, log_file):
            with open(log_file, 'a') as f:
                f.write(f"{message}\n")
            print(message)
        
        def run_command(command, log_file):
            try:
                result = subprocess.run(
                    command,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True
                )
                log_to_file(result.stdout, log_file)
                return True
            except subprocess.CalledProcessError as e:
                log_to_file(f"Command failed with error code {e.returncode}", log_file)
                log_to_file(e.stdout, log_file)
                log_to_file(e.stderr, log_file)
                return False
        
        print("Starting certificate issuance/renewal for", DOMAIN_NAME)
        
        print("Installing dependencies...")
        pip_log = LOGS_PATH / "pip_install.log"
        if not run_command(
            ["pip", "install", "certbot", "certbot-dns-route53", "awscli", "-t", str(CERTBOT_PATH)],
            pip_log
        ):
            error_message = "Failed to install dependencies. Check the logs for details."
            print(error_message)
            return {
                'statusCode': 500,
                'body': json.dumps({'error': error_message})
            }
        
        os.environ["PATH"] = f"{CERTBOT_PATH}/bin:{os.environ.get('PATH', '')}"
        os.environ["PYTHONPATH"] = f"{CERTBOT_PATH}:{os.environ.get('PYTHONPATH', '')}"
        
        domain_params = ["-d", DOMAIN_NAME]
        if ADDITIONAL_DOMAINS:
            for domain in ADDITIONAL_DOMAINS.split(','):
                domain = domain.strip()
                if domain:
                    domain_params.extend(["-d", domain])
        
        staging_param = ["--staging"] if IS_STAGING else []
        if IS_STAGING:
            print("Running in staging mode")
        
        print("Running Certbot with Route 53 plugin...")
        certbot_log = LOGS_PATH / "certbot.log"
        certbot_command = [
            "certbot", "certonly",
            "--non-interactive",
            "--agree-tos",
            "--email", EMAIL_ADDRESS,
            "--dns-route53",
            *domain_params,
            *staging_param,
            "--work-dir", str(CERTBOT_PATH),
            "--logs-dir", str(LOGS_PATH),
            "--config-dir", str(CERT_PATH)
        ]
        
        if not run_command(certbot_command, certbot_log):
            error_message = "Certificate issuance failed. Check the logs for details."
            print(error_message)
            with open(certbot_log, 'r') as f:
                print(f.read())
            return {
                'statusCode': 500,
                'body': json.dumps({'error': error_message})
            }
        
        domain_cert_path = CERT_PATH / "live" / DOMAIN_NAME
        if not domain_cert_path.exists():
            error_message = "Certificate issuance failed. Certificate files not found."
            print(error_message)
            with open(certbot_log, 'r') as f:
                print(f.read())
            return {
                'statusCode': 500,
                'body': json.dumps({'error': error_message})
            }
        
        print("Storing certificates in AWS Secrets Manager...")
        
        cert_body = (domain_cert_path / "cert.pem").read_text()
        cert_chain = (domain_cert_path / "chain.pem").read_text()
        private_key = (domain_cert_path / "privkey.pem").read_text()
        fullchain = (domain_cert_path / "fullchain.pem").read_text()
        
        secret_json = {
            "certificate": cert_body,
            "chain": cert_chain,
            "fullchain": fullchain,
            "privkey": private_key,
            "domain": DOMAIN_NAME,
            "updated_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        
        secrets_client = boto3.client('secretsmanager', region_name=AWS_SERVICES_REGION)
        
        try:
            secrets_client.describe_secret(SecretId=SECRET_NAME)
            print(f"Updating existing secret: {SECRET_NAME}")
            secrets_client.update_secret(
                SecretId=SECRET_NAME,
                SecretString=json.dumps(secret_json)
            )
        except secrets_client.exceptions.ResourceNotFoundException:
            print(f"Creating new secret: {SECRET_NAME}")
            secrets_client.create_secret(
                Name=SECRET_NAME,
                Description=f"SSL certificate for {DOMAIN_NAME}",
                SecretString=json.dumps(secret_json)
            )
        
        print("Certificate processing completed successfully!")
        print(f"Certificates are stored in AWS Secrets Manager: {SECRET_NAME}")
        
        for directory in [CERTBOT_PATH, CERT_PATH, LOGS_PATH]:
            shutil.rmtree(directory, ignore_errors=True)
        print("Cleanup completed.")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Certificate renewal completed successfully',
                'domain': DOMAIN_NAME,
                'secretName': SECRET_NAME,
                'timestamp': datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            })
        }
    
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(error_message)
        import traceback
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'body': json.dumps({'error': error_message})
        }