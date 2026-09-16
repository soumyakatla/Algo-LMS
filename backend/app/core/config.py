import urllib.parse
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AlgoLMS Modern"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretjwtkey_algolms_change_in_production_3105"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # PostgreSQL Configuration
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "moodle_user"
    POSTGRES_PASSWORD: str = "Soumya@3105"
    POSTGRES_DB: str = "algo_lms"

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        user = urllib.parse.quote_plus(self.POSTGRES_USER)
        pwd = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql+asyncpg://{user}:{pwd}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
    @property
    def SYNC_DATABASE_URI(self) -> str:
        user = urllib.parse.quote_plus(self.POSTGRES_USER)
        pwd = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{user}:{pwd}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Microsoft Entra ID (Azure AD) Credentials
    AZURE_CLIENT_ID: Optional[str] = "your-azure-client-id"
    AZURE_TENANT_ID: Optional[str] = "common"
    AZURE_CLIENT_SECRET: Optional[str] = "your-azure-client-secret"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
