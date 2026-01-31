/**
 * Generador de Agenda #ElFinde - Versión Final Consolidada
 */

let currentJsonData = null;
let userUploadedImageData = null;
let isManualColorUsed = false; 
let shuffleSeed = 0; 

let extractedPalette = {
    accents: ["#ff4757", "#2f3542", "#747d8c", "#57606f", "#ffa502"],
    backgrounds: ["#fff0f0", "#f1f2f6", "#dfe4ea", "#f5f6fa", "#ffffff"]
};

// Elementos del DOM
const jsonFileInput = document.getElementById('jsonFile');
const daySelector = document.getElementById('daySelector');
const dayTextInput = document.getElementById('dayText');
const userImgUrlInput = document.getElementById('userImageUrl');
const userImageFileInput = document.getElementById('userImageFile');
const imageAlignSelect = document.getElementById('imageAlign');
const manualAccentColorInput = document.getElementById('manualAccentColor');
const manualBgColorInput = document.getElementById('manualBgColor');
const bgColorSelector = document.getElementById('bgColorSelector');
const useSpecialTitleColor = document.getElementById('useSpecialTitleColor');
const specialTitleColor = document.getElementById('specialTitleColor');
const generateBtn = document.getElementById('generateBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const canvasContainer = document.getElementById('canvasContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');

// 1. GESTIÓN DE EVENTOS
jsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            currentJsonData = JSON.parse(event.target.result);
            populateDaySelector();
            generateBtn.disabled = false;
        } catch (err) { alert("JSON no válido."); }
    };
    reader.readAsText(file);
});

manualAccentColorInput.addEventListener('input', () => { isManualColorUsed = true; });

userImageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    userImgUrlInput.value = "";
    isManualColorUsed = false; 
    const reader = new FileReader();
    reader.onload = (event) => { userUploadedImageData = event.target.result; };
    reader.readAsDataURL(file);
});

shuffleBtn.addEventListener('click', () => {
    shuffleSeed = Math.floor(Math.random() * 1000);
    generateBtn.click();
});

function populateDaySelector() {
    daySelector.innerHTML = '';
    Object.keys(currentJsonData).forEach(day => {
        let option = document.createElement('option');
        option.value = day;
        option.textContent = day.charAt(0).toUpperCase() + day.slice(1);
        daySelector.appendChild(option);
    });
    daySelector.disabled = false;
}

// 2. GENERACIÓN PRINCIPAL
generateBtn.addEventListener('click', async () => {
    const selectedKey = daySelector.value;
    const events = currentJsonData[selectedKey];
    const displayDay = dayTextInput.value || selectedKey;
    const imgSource = userUploadedImageData || userImgUrlInput.value || '';
    const alignMode = imageAlignSelect.value;
    const isColorful = bgColorSelector.value === "colorful";
    
    canvasContainer.innerHTML = '<h3>Generando galería...</h3>';
    await document.fonts.load('10pt "Cousine"');

    if (imgSource) {
        try {
            const img = await loadImage(imgSource);
            extractedPalette = extractStrictPalette(img);
        } catch (e) { console.error("Error en paleta", e); }
    }

    // --- PORTADA ---
    let portBg, portText, portTitle;
    const portColorIdx = shuffleSeed % extractedPalette.accents.length;

    if (isColorful) {
        portBg = extractedPalette.accents[portColorIdx];
        portText = isColorDark(portBg) ? "#ffffff" : "#000000";
        portTitle = portText;
    } else {
        portBg = bgColorSelector.value === "lightAccent" ? extractedPalette.backgrounds[0] : 
                 (bgColorSelector.value === "custom" ? manualBgColorInput.value : bgColorSelector.value);
        portText = isColorDark(portBg) ? "#ffffff" : "#000000";
        portTitle = useSpecialTitleColor.checked ? specialTitleColor.value : 
                    (isManualColorUsed ? manualAccentColorInput.value : extractedPalette.accents[0]);
    }

    const titleCanvas = await createTitleImage(displayDay, imgSource, portBg, portText, portTitle, {
        free: document.getElementById('imageSourceText').value, 
        work: document.getElementById('artworkName').value, 
        artist: document.getElementById('artistName').value
    }, alignMode, isColorful, shuffleSeed);
    renderCanvas(titleCanvas, "00_portada");

    // --- EVENTOS ---
    events.forEach(async (event, index) => {
        const colorIdx = (index + shuffleSeed + 1) % extractedPalette.accents.length;
        let evBg, evAccent, evText;

        if (isColorful) {
            evBg = extractedPalette.accents[colorIdx];
            evText = isColorDark(evBg) ? "#ffffff" : "#000000";
            evAccent = evText;
        } else {
            evBg = bgColorSelector.value === "lightAccent" ? extractedPalette.backgrounds[(index + shuffleSeed) % 5] : 
                   (bgColorSelector.value === "custom" ? manualBgColorInput.value : bgColorSelector.value);
            evAccent = isManualColorUsed ? manualAccentColorInput.value : extractedPalette.accents[colorIdx];
            evText = isColorDark(evBg) ? "#ffffff" : "#000000";
        }

        const eventCanvas = await createEventImage(event, evBg, evText, evAccent, isColorful, index + shuffleSeed + 7);
        renderCanvas(eventCanvas, `evento_${index + 1}`);
    });

    canvasContainer.querySelector('h3').remove();
    downloadAllBtn.style.display = 'block';
});

// 3. MOTOR DE PATRONES TOTAL (12 Variantes)
async function drawBackground(ctx, width, height, color, usePattern, seed) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    if (usePattern) {
        const hsl = hexToHsl(color);
        const patternColor = hslToHex(hsl.h, hsl.s, hsl.l > 0.5 ? hsl.l - 0.18 : hsl.l + 0.18);
        
        ctx.save();
        ctx.strokeStyle = patternColor;
        ctx.fillStyle = patternColor;
        ctx.globalAlpha = 0.25;

        const patternType = seed % 12; 
        const spacing = 50;

        switch(patternType) {
            case 0: // Líneas rectas horizontales
                for(let i=0; i<height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }
                break;
            case 1: // Líneas oblicuas (derecha)
                for(let i=-height; i<width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+height, height); ctx.stroke(); }
                break;
            case 2: // Líneas oblicuas (izquierda)
                for(let i=0; i<width+height; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i-height, height); ctx.stroke(); }
                break;
            case 3: // Cuadrícula (Grid)
                for(let i=0; i<width; i+=spacing) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke(); }
                for(let i=0; i<height; i+=spacing) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(width,i); ctx.stroke(); }
                break;
            case 4: // Círculos (Dots)
                for(let x=0; x<width; x+=spacing) { for(let y=0; y<height; y+=spacing) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill(); } }
                break;
            case 5: // Triángulos
                for(let x=0; x<width; x+=60) { for(let y=0; y<height; y+=60) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+15, y+30); ctx.lineTo(x-15, y+30); ctx.closePath(); ctx.fill(); } }
                break;
            case 6: // Cruces (+)
                for(let x=0; x<width; x+=spacing) { for(let y=0; y<height; y+=spacing) { ctx.beginPath(); ctx.moveTo(x-10,y); ctx.lineTo(x+10,y); ctx.moveTo(x,y-10); ctx.lineTo(x,y+10); ctx.stroke(); } }
                break;
            case 7: // Hexágonos
                for(let x=0; x<width; x+=80) { for(let y=0; y<height; y+=70) { const ox = x + (y%140==0?0:40); ctx.beginPath(); for(let a=0; a<6; a++) { ctx.lineTo(ox+20*Math.cos(a*Math.PI/3), y+20*Math.sin(a*Math.PI/3)); } ctx.closePath(); ctx.stroke(); } }
                break;
            case 8: // Zig-Zag
                ctx.lineWidth = 3; for(let y=0; y<height; y+=spacing) { ctx.beginPath(); ctx.moveTo(0, y); for(let x=0; x<width; x+=20) { ctx.lineTo(x, y + (x%40==0?15:-15)); } ctx.stroke(); }
                break;
            case 9: // Rombos
                for(let x=0; x<width; x+=60) { for(let y=0; y<height; y+=60) { ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4); ctx.strokeRect(-12,-12,24,24); ctx.restore(); } }
                break;
            case 10: // Cuadrados rellenos pequeños
                for(let x=0; x<width; x+=spacing) { for(let y=0; y<height; y+=spacing) { ctx.fillRect(x, y, 10, 10); } }
                break;
            case 11: // Ondas (Seno)
                for(let y=0; y<height; y+=spacing) { ctx.beginPath(); for(let x=0; x<width; x+=5) { ctx.lineTo(x, y + Math.sin(x*0.05)*10); } ctx.stroke(); }
                break;
        }
        ctx.restore();
    }

    try {
        const grungeImg = await loadImage('grunge.png');
        ctx.globalCompositeOperation = isColorDark(color) ? "screen" : "multiply";
        ctx.globalAlpha = 0.12;
        ctx.drawImage(grungeImg, 0, 0, width, height);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1.0;
    } catch (e) {}
}

// 4. FUNCIONES DE APOYO
function extractStrictPalette(img) {
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    canvas.width = 50; canvas.height = 50; ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    let colors = [];
    for (let i = 0; i < data.length; i += 20) {
        let hsl = rgbToHsl(data[i], data[i+1], data[i+2]);
        if (hsl.s > 0.15 && hsl.l > 0.1 && hsl.l < 0.9) colors.push(hsl);
    }
    colors.sort((a, b) => b.s - a.s);
    let uniqueHues = colors.filter((c, i, self) => self.findIndex(t => Math.abs(t.h - c.h) < 0.08) === i);
    if (uniqueHues.length < 2) {
        let base = uniqueHues[0] || {h: 0, s: 0.5, l: 0.5};
        uniqueHues = Array.from({length:5}, (_,i) => ({h:(base.h+i*0.2)%1, s:base.s, l:base.l}));
    }
    return {
        accents: uniqueHues.slice(0, 5).map(c => hslToHex(c.h, c.s, c.l)),
        backgrounds: uniqueHues.slice(0, 5).map(c => hslToHex(c.h, 0.1, 0.96))
    };
}

async function createTitleImage(day, imgSource, bgColor, textColor, titleColor, credits, align, isColorful, seed) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    await drawBackground(ctx, canvas.width, canvas.height, bgColor, isColorful, seed);
    
    ctx.fillStyle = titleColor; ctx.textAlign = 'center'; ctx.font = 'bold 95px Cousine';
    ctx.fillText('Agenda #ElFinde', 540, 250);
    ctx.fillStyle = textColor; ctx.font = '55px Cousine';
    ctx.fillText(day.toUpperCase(), 540, 350);

    if (imgSource) {
        try {
            const img = await loadImage(imgSource);
            const targetX = 115, targetY = 430, targetW = 850, targetH = 650;
            ctx.save(); ctx.beginPath(); ctx.roundRect(targetX, targetY, targetW, targetH, 30); ctx.clip();
            const imgAspect = img.width / img.height; const targetAspect = targetW / targetH;
            let dW, dH, dX, dY;
            if (imgAspect > targetAspect) { dH = targetH; dW = targetH * imgAspect; }
            else { dW = targetW; dH = targetW / imgAspect; }
            dX = targetX + (targetW - dW) / 2; dY = targetY + (targetH - dH) / 2;
            if (align === 'top') dY = targetY; if (align === 'bottom') dY = targetY + (targetH - dH);
            if (align === 'left') dX = targetX; if (align === 'right') dX = targetX + (targetW - dW);
            ctx.drawImage(img, dX, dY, dW, dH); ctx.restore();

            ctx.fillStyle = textColor; ctx.globalAlpha = 0.6; ctx.font = '20px Cousine';
            let cText = credits.work ? `"${credits.work}"` : (credits.free || "");
            if(credits.artist) cText += ` por ${credits.artist}`;
            ctx.fillText(cText, 540, 1120); ctx.globalAlpha = 1.0;
        } catch (e) {}
    }
    // Modificado para pasar el color del texto
    await drawBannerFooter(ctx, canvas.width, canvas.height, textColor);
    return canvas;
}

async function createEventImage(event, bgColor, textColor, accentColor, isColorful, seed) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    await drawBackground(ctx, canvas.width, canvas.height, bgColor, isColorful, seed);
    ctx.strokeStyle = accentColor; ctx.lineWidth = 20; ctx.strokeRect(40, 40, 1000, 1270);
    ctx.fillStyle = accentColor; ctx.font = 'bold 35px Cousine';
    ctx.fillText(`[ ${event.categoria.toUpperCase()} ]`, 100, 150);
    ctx.fillStyle = textColor; ctx.font = 'bold 65px Cousine';
    let currentY = wrapText(ctx, event.nombre, 100, 250, 880, 75);
    ctx.font = 'bold 30px Cousine'; ctx.globalAlpha = 0.7;
    ctx.fillText(`CIUDAD: ${event.ciudad}`, 100, currentY + 60);
    currentY = wrapText(ctx, `UBICACIÓN: ${event.direccion}`, 100, currentY + 105, 880, 40);
    ctx.font = '32px Cousine'; ctx.globalAlpha = 1.0;
    wrapText(ctx, event.comentario, 100, currentY + 60, 880, 45);
    if (event.ticket === true) {
        ctx.textAlign = 'center'; ctx.fillStyle = accentColor; ctx.font = 'bold 38px Cousine';
        ctx.fillText("ENTRADAS EN TICKETMISIONES.COM.AR", 540, 1200);
    }
    return canvas;
}

// Helpers técnicos
function isColorDark(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 130; 
}

// Modificado para elegir el banner según el color del texto
async function drawBannerFooter(ctx, canvasWidth, canvasHeight, textColor) {
    try {
        const bannerFile = isColorDark(textColor) ? 'banner.png' : 'banner_blanco.png';
        const banner = await loadImage(bannerFile);
        const bannerW = canvasWidth; const bannerH = banner.height * (bannerW / banner.width);
        ctx.drawImage(banner, 0, canvasHeight - bannerH, bannerW, bannerH);
    } catch (e) {
        console.error("Error cargando banner:", e);
    }
}

function hexToHsl(hex) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return rgbToHsl(r, g, b);
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) h = s = 0;
    else {
        const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
        h /= 6;
    }
    return { h, s, l };
}
function hslToHex(h, s, l) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
    const f = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p;
    };
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(p,q,h+1/3))}${toHex(f(p,q,h))}${toHex(f(p,q,h-1/3))}`;
}
function loadImage(url) { return new Promise((res, rej) => { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => res(img); img.onerror = rej; img.src = url; }); }
function wrapText(ctx, text, x, y, maxWidth, lineHeight) { if(!text) return y; const words = text.split(' '); let line = ''; for(let n=0; n<words.length; n++) { let test = line + words[n] + ' '; if (ctx.measureText(test).width > maxWidth && n > 0) { ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; } else line = test; } ctx.fillText(line, x, y); return y + lineHeight; }
function renderCanvas(canvas, filename) { const wrapper = document.createElement('div'); wrapper.className = 'canvas-wrapper'; canvas.onclick = () => { const link = document.createElement('a'); link.download = `${filename}.png`; link.href = canvas.toDataURL(); link.click(); }; wrapper.appendChild(canvas); canvasContainer.appendChild(wrapper); }
downloadAllBtn.addEventListener('click', async () => { const zip = new JSZip(); canvasContainer.querySelectorAll('canvas').forEach((c, i) => { zip.file(i === 0 ? "portada.png" : `evento_${i}.png`, c.toDataURL().split(',')[1], {base64: true}); }); const blob = await zip.generateAsync({type: "blob"}); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "agenda_completa.zip"; link.click(); });