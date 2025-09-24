Write-Host "Actualizando variables de entorno en Vercel..." -ForegroundColor Green

# Función para actualizar variable de entorno
function Update-VercelEnv {
    param($name, $value)
    
    Write-Host "Actualizando $name..." -ForegroundColor Yellow
    
    # Crear archivo temporal con el valor
    $tempFile = [System.IO.Path]::GetTempFileName()
    $value | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
    
    # Usar el archivo temporal para el valor
    $result = cmd /c "vercel env add $name production < `"$tempFile`" 2>&1"
    
    # Limpiar archivo temporal
    Remove-Item $tempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $name actualizada correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error actualizando $name" -ForegroundColor Red
        Write-Host $result
    }
}

# Variables públicas de Firebase
Write-Host "`n🌐 Actualizando variables públicas..." -ForegroundColor Cyan

Update-VercelEnv "NEXT_PUBLIC_FIREBASE_API_KEY" "AIzaSyCECUyQ0yg2bCSdBbZZtU_XRquxh0z4NtY"
Update-VercelEnv "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "novafact-6c281.firebaseapp.com" 
Update-VercelEnv "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "novafact-6c281"
Update-VercelEnv "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "novafact-6c281.firebasestorage.app"
Update-VercelEnv "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "546035630036"
Update-VercelEnv "NEXT_PUBLIC_FIREBASE_APP_ID" "1:546035630036:web:3e64b074aff2a5ab3a2041"

Write-Host "`n✅ Variables actualizadas. Ejecutando redeploy..." -ForegroundColor Green