terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 2.0"
    }
  }
}

provider "docker" {}

data "docker_network" "my_network" {
  name = "my_network"
}

resource "docker_image" "postgres_image" {
  name         = "postgres:13"
  keep_locally = false
}

resource "docker_container" "postgres_container" {
  image = docker_image.postgres_image.name
  name  = "postgres-db"
  env = [
    "POSTGRES_USER=user",
    "POSTGRES_PASSWORD=password",
    "POSTGRES_DB=mydatabase"
  ]
  networks_advanced {
    name = data.docker_network.my_network.name
  }
  ports {
    internal = 5432
    external = 5432
  }
}

resource "docker_image" "web_image" {
  name         = "mi-landing-page:latest"
  keep_locally = false
}

resource "docker_container" "web_container" {
  image = docker_image.web_image.name
  name  = "landing-page"
  env = [
    "POSTGRES_USER=user",
    "POSTGRES_PASSWORD=password",
    "POSTGRES_DB=mydatabase",
    "DB_HOST=postgres-db"
  ]
  networks_advanced {
    name = data.docker_network.my_network.name
  }
  ports {
    internal = 3000
    external = 3000
  }
  volumes {
    host_path      = "/c/Users/Usuario Dell/Desktop/ProyectoVirtualizacion/logs"
    container_path = "/logs"
  }
  depends_on = [docker_container.postgres_container]
}

output "web_url" {
  value = "http://${docker_container.web_container.name}:3000"
}

output "db_url" {
  value = "postgres://${docker_container.postgres_container.name}:5432/mydatabase"
}
