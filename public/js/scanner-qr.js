// Scanner QR code pour pharmacien et urgentiste
// Utilise l'API getUserMedia pour accéder à la caméra

let stream = null
let scanning = false

async function demarrerScanner() {
  try {
    const video = document.getElementById('qr-video')
    const canvas = document.getElementById('qr-canvas')
    const ctx = canvas.getContext('2d')
    const resultat = document.getElementById('qr-resultat')

    // Demander accès caméra
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })

    video.srcObject = stream
    video.play()
    scanning = true

    // Scanner en continu
    const scanInterval = setInterval(() => {
      if (!scanning) {
        clearInterval(scanInterval)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // TODO: Utiliser une librairie de détection QR (jsQR, ZXing)
      // const code = jsQR(imageData.data, canvas.width, canvas.height)
      // if (code) {
      //   resultat.textContent = 'QR détecté : ' + code.data
      //   arreterScanner()
      //   // Rediriger vers la page de vérification
      //   window.location.href = '/pharmacien/ordonnances/' + code.data
      // }
    }, 100)

    document.getElementById('btn-stop').style.display = 'inline-block'
    document.getElementById('btn-start').style.display = 'none'

  } catch (err) {
    console.error('Erreur accès caméra:', err)
    alert('⚠️ Impossible d\'accéder à la caméra. Vérifiez les permissions.')
  }
}

function arreterScanner() {
  scanning = false
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  document.getElementById('btn-stop').style.display = 'none'
  document.getElementById('btn-start').style.display = 'inline-block'
}

// Arrêter le scanner quand on quitte la page
window.addEventListener('beforeunload', arreterScanner)
