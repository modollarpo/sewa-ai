# mock_hospital_client.py
import flwr as fl
import torch
import torch.nn as nn
import time
import sys

# Simple dummy model matching a hypothetical CNN
class DummyModel(nn.Module):
    def __init__(self):
        super(DummyModel, self).__init__()
        self.fc = nn.Linear(10, 2)

    def forward(self, x):
        return self.fc(x)

def main():
    print("Starting Mock Hospital Client...")
    model = DummyModel()
    
    class HospitalClient(fl.client.NumPyClient):
        def get_parameters(self, config):
            print("[Client] get_parameters called")
            return [val.cpu().numpy() for _, val in model.state_dict().items()]

        def fit(self, parameters, config):
            print(f"[Client] fit called for round {config.get('round', '?')}")
            # Load received parameters
            params_dict = zip(model.state_dict().keys(), parameters)
            state_dict = {k: torch.tensor(v) for k, v in params_dict}
            model.load_state_dict(state_dict, strict=True)
            
            # Simulate training delay
            time.sleep(2)
            
            # Return updated parameters, number of examples, and metrics
            return self.get_parameters(config={}), 1000, {"hospital": "lagos-ng-1", "epsilon": 1.2}

        def evaluate(self, parameters, config):
            print(f"[Client] evaluate called for round {config.get('round', '?')}")
            # Simulate evaluation delay
            time.sleep(1)
            # Return loss, number of examples, and metrics
            return 0.15, 500, {"accuracy": 0.96}

    # Start client connecting to central FL server
    print("Connecting to FL server at localhost:8080...")
    try:
        fl.client.start_numpy_client(server_address="localhost:8080", client=HospitalClient())
    except Exception as e:
        print(f"Client error: {e}")

if __name__ == "__main__":
    # Wait a few seconds to ensure server is up
    time.sleep(3)
    main()
