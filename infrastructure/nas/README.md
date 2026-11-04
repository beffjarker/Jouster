# Deployment Instructions for Nx Remote Cache, Verdaccio NPM Mirror, and Nginx Static Model Mirror on Synology NAS

## Prerequisites
- Synology DiskStation Manager (DSM) installed.
- Docker package installed from DSM Package Center.

## Steps to Deploy
1. **Clone the Repository**: Clone this repository to your local machine or directly to your Synology NAS if it has Git support.
2. **Navigate to the Directory**: Go to the `infrastructure/nas` directory in your cloned repository.
3. **Start Docker Compose**: Run `docker-compose up -d` to start all services defined in the `docker-compose.yml` file.

## Services Overview
- **Nx Remote Cache**: Used for caching build artifacts to speed up Nx workspace builds.
- **Verdaccio NPM Mirror**: Acts as a private npm registry, mirroring packages from the public npm registry.
- **Nginx Static Model Mirror**: Serves static files and can be used to mirror models or other static assets.

## Troubleshooting
- Ensure Docker is running on your Synology NAS.
- Check the logs for each service using `docker-compose logs <service_name>` if you encounter issues.