cd backend
npx prisma db push
cd ../ai-services/federated-learning
pip install -r requirements.txt
python main.py &
python mock_hospital_client.py
