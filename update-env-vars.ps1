# Script para actualizar variables de entorno en Vercel
# Basado en las credenciales de Firebase proporcionadas

Write-Host "🔧 Actualizando variables de entorno de Firebase en Vercel..." -ForegroundColor Green

# Variables del archivo de credenciales
$PROJECT_ID = "novafact-6c281"
$CLIENT_EMAIL = "firebase-adminsdk-fbsvc@novafact-6c281.iam.gserviceaccount.com"
$PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----`nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIHiWcWYd2cePX`nVnh8aRmiPJv64EC5BenQh2ySCVTAGNTu4+PsdPI+MIZ3YGlyLM1j7JferesNYOLT`ncsxCEhDYc36YvJsR3yDh3+zXkdM/+Jkco3Z8wra5j1+Dnqon528loGTTyojVg++q`nHoFG8e4z2G9JH9TNfPvz6puw+R7Z8MwsMiq8dWC6VWl8lX/DmHM2jt+9/spw7Ers`nYoaAsYnBS0TRrTBD7VnwMPn+gFNztkAP6qVNMsdjD6Ucg6+Y0sS/dEJtX6zGDZnh`nU8L/LMwGmEtposel9Hvw9twNM7b3cg7FZKBo7HVDYiiPGFchVI6fs8Q6Rv/aZmFg`ntSwewX0rAgMBAAECggEAWIgpyHk9OjPZgf9Bz3xpuEILGZqTV6ebkMMQz6ysH039`nCfCs+YOlVcj+/BodnELg3MejSoLzvZfy0Wv0nHhElpXF2Il8KxRlBjicHaRoamEv`nT6GrfjdgQkiBD4gmq/+xxtomMSJlldxIL6FOPRYz9SDX3uhjq0MTbg4JMeqMcQrT`nhOQrJLs2CgDb+1FRGGnvk6eOu1cH2FdVVCUHSbFnf+AyBn82DQxEnenkzYI62Ndk`nRiocBMJtkFJqPk07uVZeNZIGtHwoQYVI6j/oH+MCDD/4J4b0hJ65gYl6chFeH0N7`n7ABsIcXaI2/RXx7tqNfK+zXtlFIqS7VkAbJyi5oFrQKBgQDxKgrhTdKgJjHcmos2`nkYVq6mvXSV5Fy9Xwz+ihc+g9IoblTUkyDWqGtU+7sFtKBbBhxo3TQQo9tMhtdjEg`nQDSLtwFA98nb2BlQFHnXi/WBzzum7WrAQ3k65zKbnbQBkmBgVgzOdi743k+hhwPz`nnJMdcGjTDp54P1fAaBNu6kQ89wKBgQDUba/kpeI1PMaP1/5xG4zC5E3sdBlu2Ibb`nWGmZsStHfx7FZThbXNC2szfI0eYvUjvyyK54ZKu5giFr/m2zqVrTiIUfHQIbzpvj`nIlYVCgT1Id28bBYWbNmCMG+SaKhYT/co/42k2piLNnK/1SuOF6Ppx2aExs8s+cm0`nC/XKPK64bQKBgFXE6hGvJ9WlP96BaDmED7synB/5C/ouwGvgxY+GNXZorSkoD3wp`noVU/bpgF5LGyzEQ55X7YhtfjT9T+UAJ0UzvNXjjI55W0iWwdnCe4sxvzo/d+QJUY`naik0yJ7nu3lDodshP3S+O35vMkr0RceCTCAQNne5n0qM3JylZyPvVU2JAoGAW5+P`nzTQLVGEJV8OW2FxEo07rmUAeNCQqTnNc4NB81VKsCAH3g9iNoS+9sN1vxhtXBgmu`nzvjE5LePCNBtqp8yMKjimh/d5/Z+YEJQFLUEnGJmDD4mbLe4PSH9DY4chjK/bSyE`ngIVUZD8w0TL1nUzvAwdhXYWOmFyItiKuefMgfSUCgYBdcYv2jlZRaewk79l1A8zY`nITxW2Y7hUB9yrhr45z+hKQxQ5tfAEMLLmasC3MtnQrjdrJVUPxj/kI9Telmpzd9Y`nduWl6eDD5Aipvq1eNEbuGk+wnyX1XYUgrva/etsekN/L2VdtEzVCtFoUpGPlrwln`nqmFBnnX/YIq/j1SjiO8FKg==`n-----END PRIVATE KEY-----"

Write-Host "📋 Variables que necesitas actualizar en Vercel:" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔑 VARIABLES ADMINISTRATIVAS (Server-side):" -ForegroundColor Cyan
Write-Host "FIREBASE_PROJECT_ID = $PROJECT_ID"
Write-Host "FIREBASE_CLIENT_EMAIL = $CLIENT_EMAIL"
Write-Host "FIREBASE_PRIVATE_KEY = [PRIVATE KEY - Ver abajo]"
Write-Host ""
Write-Host "🌐 VARIABLES PÚBLICAS (Client-side) - FALTAN:" -ForegroundColor Red
Write-Host "NEXT_PUBLIC_FIREBASE_PROJECT_ID = $PROJECT_ID"
Write-Host "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = $PROJECT_ID.firebaseapp.com"
Write-Host "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = $PROJECT_ID.appspot.com"
Write-Host "NEXT_PUBLIC_FIREBASE_API_KEY = [NECESITAS OBTENERLA DE FIREBASE CONSOLE]"
Write-Host "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = [NECESITAS OBTENERLA DE FIREBASE CONSOLE]"
Write-Host "NEXT_PUBLIC_FIREBASE_APP_ID = [NECESITAS OBTENERLA DE FIREBASE CONSOLE]"
Write-Host ""
Write-Host "🔐 PRIVATE KEY (copia exactamente):" -ForegroundColor Green
Write-Host $PRIVATE_KEY
Write-Host ""
Write-Host "🌐 Ve a Firebase Console para obtener las variables públicas:"
Write-Host "https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
Write-Host ""
Write-Host "⚡ Una vez actualizadas, redeploya con: vercel --prod"