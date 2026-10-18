
const canvas = document.getElementById("rayCanvas");
const ctx = canvas.getContext("2d");

const colorInput = document.getElementById("sphereColor");
const radiusInput = document.getElementById("sphereRadius");
const lightXInput = document.getElementById("lightX");
const lightYInput = document.getElementById("lightY");
const brightnessInput = document.getElementById("brightness");

const radiusValue = document.getElementById("radiusValue");
const renderInfo = document.getElementById("renderInfo");

const renderBtn = document.getElementById("renderBtn");
const resetBtn = document.getElementById("resetBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Операції над тривимірними векторами
function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

function subtract(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

function multiply(v, k) {
    return {
        x: v.x * k,
        y: v.y * k,
        z: v.z * k
    };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v) {
    const length = Math.sqrt(dot(v, v));
    return multiply(v, 1 / length);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

// Перетин променя зі сферою
function intersectSphere(origin, direction, center, radius) {
    const oc = subtract(origin, center);

    const a = dot(direction, direction);
    const b = 2 * dot(oc, direction);
    const c = dot(oc, oc) - radius * radius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
        return null;
    }

    const sqrtD = Math.sqrt(discriminant);

    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);

    if (t1 > 0.0001) return t1;
    if (t2 > 0.0001) return t2;

    return null;
}

// Перетин променя з горизонтальною площиною
function intersectPlane(origin, direction, planeY) {
    if (Math.abs(direction.y) < 0.00001) {
        return null;
    }

    const t = (planeY - origin.y) / direction.y;

    return t > 0.0001 ? t : null;
}

// Основна функція трасування променів
function renderScene() {
    const startTime = performance.now();

    renderInfo.textContent = "Виконується трасування променів...";

    const image = ctx.createImageData(WIDTH, HEIGHT);
    const pixels = image.data;

    const radius = parseFloat(radiusInput.value);
    const brightness = parseFloat(brightnessInput.value);

    const sphereColor = hexToRgb(colorInput.value);

    const camera = { x: 0, y: 1.2, z: 5 };
    const sphereCenter = { x: 0, y: 0.8, z: 0 };

    const light = {
        x: parseFloat(lightXInput.value),
        y: parseFloat(lightYInput.value),
        z: 3
    };

    const planeY = sphereCenter.y - radius - 0.15;

    const aspect = WIDTH / HEIGHT;
    const scale = Math.tan(Math.PI / 6);

    let spherePixels = 0;

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {

            // Формування первинного променя
            const px = (2 * (x + 0.5) / WIDTH - 1)
                * aspect * scale;

            const py = (1 - 2 * (y + 0.5) / HEIGHT)
                * scale;

            const direction = normalize({
                x: px,
                y: py,
                z: -1
            });

            const tSphere = intersectSphere(
                camera, direction, sphereCenter, radius
            );

            const tPlane = intersectPlane(
                camera, direction, planeY
            );

            let r, g, b;

            if (tSphere !== null &&
                (tPlane === null || tSphere < tPlane)) {

                spherePixels++;

                // Точка перетину зі сферою
                const point = add(
                    camera, multiply(direction, tSphere)
                );

                // Нормаль до поверхні
                const normal = normalize(
                    subtract(point, sphereCenter)
                );

                // Напрямок на джерело світла
                const toLight = normalize(
                    subtract(light, point)
                );

                // Дифузне освітлення
                const diffuse = Math.max(
                    0, dot(normal, toLight)
                );

                // Фонове освітлення
                const ambient = 0.18;

                // Дзеркальний відблиск
                const viewDirection = normalize(
                    subtract(camera, point)
                );

                const halfVector = normalize(
                    add(toLight, viewDirection)
                );

                const specular = Math.pow(
                    Math.max(0, dot(normal, halfVector)),
                    64
                );

                // Перевірка затінення
                const shadowOrigin = add(
                    point, multiply(normal, 0.001)
                );

                const shadowT = intersectSphere(
                    shadowOrigin,
                    toLight,
                    sphereCenter,
                    radius
                );

                const lightDistance = Math.sqrt(
                    dot(subtract(light, point),
                        subtract(light, point))
                );

                const shadow = shadowT !== null &&
                    shadowT < lightDistance ? 0.15 : 1;

                const intensity = ambient +
                    diffuse * brightness * shadow;

                r = sphereColor.r * intensity +
                    255 * specular * brightness * shadow;

                g = sphereColor.g * intensity +
                    255 * specular * brightness * shadow;

                b = sphereColor.b * intensity +
                    255 * specular * brightness * shadow;

            } else if (tPlane !== null) {

                // Формування підлоги
                const point = add(
                    camera, multiply(direction, tPlane)
                );

                const checker =
                    (Math.floor(point.x) +
                     Math.floor(point.z)) % 2 === 0;

                const base = checker ? 105 : 70;

                const shadowOrigin = {
                    x: point.x,
                    y: point.y + 0.001,
                    z: point.z
                };

                const lightVector = subtract(light, shadowOrigin);
                const lightDistance = Math.sqrt(
                    dot(lightVector, lightVector)
                );

                const toLight = normalize(lightVector);

                const shadowT = intersectSphere(
                    shadowOrigin,
                    toLight,
                    sphereCenter,
                    radius
                );

                const inShadow = shadowT !== null &&
                    shadowT < lightDistance;

                const illumination = inShadow
                    ? 0.35
                    : 0.55 + 0.45 * brightness *
                      Math.max(0, toLight.y);

                r = base * illumination;
                g = base * illumination * 1.08;
                b = base * illumination * 1.12;

            } else {

                // Колір фону
                const gradient = y / HEIGHT;

                r = 20 + 18 * gradient;
                g = 31 + 22 * gradient;
                b = 43 + 25 * gradient;
            }

            const index = (y * WIDTH + x) * 4;

            pixels[index] = clamp(r, 0, 255);
            pixels[index + 1] = clamp(g, 0, 255);
            pixels[index + 2] = clamp(b, 0, 255);
            pixels[index + 3] = 255;
        }
    }

    ctx.putImageData(image, 0, 0);

    const elapsed = (performance.now() - startTime).toFixed(0);

    renderInfo.textContent =
        `Зображення сформовано за ${elapsed} мс. ` +
        `Пікселів сфери: ${spherePixels}. ` +
        `Трасовано променів: ${WIDTH * HEIGHT}.`;
}

// Оновлення значення радіуса
radiusInput.addEventListener("input", () => {
    radiusValue.textContent =
        parseFloat(radiusInput.value).toFixed(1);
});

// Побудова зображення
renderBtn.addEventListener("click", renderScene);

// Скидання параметрів
resetBtn.addEventListener("click", () => {
    colorInput.value = "#8b2635";
    radiusInput.value = "1";
    lightXInput.value = "-3";
    lightYInput.value = "4";
    brightnessInput.value = "1";

    radiusValue.textContent = "1.0";

    renderScene();
});

// Початкова побудова
renderScene();
