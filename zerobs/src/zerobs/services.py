import subprocess
import signal
import atexit
from typing import Dict, Optional
from dataclasses import dataclass
import os

@dataclass
class Service:
    name: str
    process: Optional[subprocess.Popen] = None
    command: str = ""
    cwd: str = "."

class ServiceManager:
    def __init__(self):
        self.services: Dict[str, Service] = {}
        atexit.register(self.stop_all_services)
        
    def start_service(self, name: str, command: str, cwd: str = ".") -> None:
        """Start a service with the given name and command."""
        if name in self.services and self.services[name].process and self.services[name].process.poll() is None:
            print(f"Service {name} is already running")
            return
            
        try:
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                preexec_fn=os.setsid  # Create a new process group
            )
            self.services[name] = Service(name=name, process=process, command=command, cwd=cwd)
            print(f"Started service: {name}")
        except Exception as e:
            print(f"Failed to start service {name}: {str(e)}")

    def stop_service(self, name: str) -> None:
        """Stop a specific service."""
        if name not in self.services or not self.services[name].process:
            print(f"Service {name} is not running")
            return
            
        try:
            process = self.services[name].process
            if process and process.poll() is None:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)  # Send SIGTERM to process group
                try:
                    process.wait(timeout=5)  # Wait up to 5 seconds for graceful shutdown
                except subprocess.TimeoutExpired:
                    os.killpg(os.getpgid(process.pid), signal.SIGKILL)  # Force kill if necessary
                    process.wait()
            print(f"Stopped service: {name}")
        except Exception as e:
            print(f"Error stopping service {name}: {str(e)}")
        finally:
            self.services[name].process = None

    def stop_all_services(self) -> None:
        """Stop all running services."""
        for name in list(self.services.keys()):
            self.stop_service(name)

# Create a global service manager instance
service_manager = ServiceManager()

def start_required_services():
    """Start all required services for the application."""
    # Start Jupyter Lab
    service_manager.start_service(
        "jupyter",
        "jupyter lab --port 8888 --IdentityProvider.token zerobs --ip 0.0.0.0",
        cwd="."
    )
    
    # Start docling-serve
    service_manager.start_service(
        "docling",
        "uv run docling-serve run",
        cwd="."
    ) 