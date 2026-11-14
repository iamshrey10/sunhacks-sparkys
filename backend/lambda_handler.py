"""AWS Lambda entry point. Handler: backend.lambda_handler.handler

Runs the same FastAPI app behind a Lambda Function URL. Keys come from the
function's environment variables, never from files.
"""

from mangum import Mangum

from backend.api.main import app

handler = Mangum(app, lifespan="off")
