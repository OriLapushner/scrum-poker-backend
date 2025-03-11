import json
import subprocess
import os
import base64

def lambda_handler(event, context):
    script_path = os.path.join(os.path.dirname(__file__), 'certbot-script.sh')
    
    try:
        result = subprocess.run(
            ['/bin/bash', script_path],
            capture_output=True,
            text=True
        )
        
        response = {
            'statusCode': 200,
            'body': json.dumps({
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            })
        }
        
    except Exception as e:
        # Handle any errors
        response = {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
    
    return response
