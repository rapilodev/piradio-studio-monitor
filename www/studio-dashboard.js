const imageUrl = 'https://piradio.de/';
const levelUrl = 'https://piradio.de/level/data';
const eventUrl = "https://fr-bb.org/agenda/dashboard/level/";
const SEC = 1000;

const formatDigits = i => i < 10 ? "0" + i : i;

const formatTime = date => [formatDigits(date.getHours()), formatDigits(date.getMinutes())].join(":");

const formatDate = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(formatDigits).join("-");

const getNow = () => new Date();

const toDateTime = secs => {
    const t = new Date(1970, 0, 1);
    t.setSeconds(secs);
    return t;
};

const showRuntime = (events, now) => {
    if (!events) return;
    events.forEach(event => {
        const started = (now - Date.parse(event.start)) / 1000;
        const stops = (Date.parse(event.end) - now) / 1000;
        if (started > 0 && stops > 0) {
            const runningElem = document.getElementById('running');
            runningElem.classList.toggle("ending", stops < 18000);
            document.getElementById('event-progress').value = Math.round(100 * started / (started + stops));
            setSecs('clock2', toDateTime(stops + 1));
        }
    });
};

const updateAttr = (elem, name, value) => {
     if (elem.getAttribute(name) == value) return;
    elem.setAttribute(name, value);
}

const updateContent = (elem, s) => {
    if (elem.innerHTML == s) return;
    elem.innerHTML = s;
}

let events = [];
const showEvents = (events, now) => {
    let run_elems = [
        "aevent-img",
        "aevent-time",
        "aevent-excerpt",
        "aclock2",
        "aevent-progress"
    ].map(id => document.getElementById(id));

    var running = false;
    events.forEach(event => {
        const started = (now - Date.parse(event.start)) / 1000;
        const stops = (Date.parse(event.end) - now) / 1000;
        running = started > 0 && stops > 0;
        if (running) {
            const size = 2 * document.getElementById("event").clientWidth;
            const cl = event.title.length;
            const el = event.excerpt.length;
            const csize = Math.max( "20", Math.round(size / cl)) + "px" ;
            const esize = Math.max( "20", Math.round(size / el)) + "px" ;
            document.getElementById('event-progress').style.display = (started > 0 && stops > 0) ? "block": "none";
            updateAttr(document.getElementById('event-img'), "src", imageUrl + event.image_url);
            updateContent(document.getElementById('event-time'), 
                formatTime(new Date(Date.parse(event.start))) + " - " + formatTime(new Date(Date.parse(event.end)))
            );
            updateContent(document.getElementById('event-title'), event.title.substr(0, 52));
            updateContent(document.getElementById('event-excerpt'), event.excerpt.substr(0, 104));

            document.getElementById('event-time').style.fontSize    = csize;
            document.getElementById('event-title').style.fontSize   = csize;
            document.getElementById('event-excerpt').style.fontSize = esize; 
            run_elems.forEach(e => e && e.classList.add("hidden"));
        }
    });
    if (running == false) {
        updateContent(document.getElementById('event-title'), "unbekannt");
        run_elems.forEach(e => e && e.classList.add("hidden"));
    }
};

const updateEvents = async () => {
    try{
        const date = formatDate(getNow());
        const response = await fetch(eventUrl);
        events = await response.json();
    } catch(e) {
        events = [];
    }
};

const setChannel = (peakId, peak, rmsId, rms) => {
    document.querySelector(`${peakId} #peakLabel`).innerText = Math.round(peak);
    document.querySelector(`${rmsId} #rmsLabel`).innerText = Math.round(rms);

    peak *= -1;
    const peakElem = document.querySelector(peakId);
    peakElem.classList.toggle("loudPeak", peak < 1);
    peakElem.classList.toggle("mediumPeak", peak < 3);

    rms *= -1;
    const rmsElem = document.querySelector(rmsId);
    rmsElem.classList.toggle("loudRms", rms < 18);
    rmsElem.classList.toggle("silent", rms > 30);

    peakElem.style.height = `${100 - peak}%`;
    rmsElem.style.height = `${100 - rms}%`;
};

const showLevel = async () => {
    try {
        const response = await fetch(levelUrl);
        const data = await response.json();
        document.getElementById("meters").classList.remove("hidden");
        ["in","out"].forEach(dir => {
            ["left", "right"].forEach(channel => {
                setChannel(
                    `#${dir}-${channel} #peak`, data[dir][`peak-${channel}`], 
                    `#${dir}-${channel} #rms`, data[dir][`rms-${channel}`]
                );
            });
        });
    } catch(error) {
        console.log(error)
        document.getElementById("meters").classList.add("hidden");
    };
};

const synchronize = f => {
    const now = getNow();
    const next = new Date(now.getTime());
    next.setSeconds(now.getSeconds() + 1);
    next.setMilliseconds(0);
    setTimeout(f, next - now);
};

const drawCircle = (offset, r, steps, size, className, prefix) => {
    return Array.from({ length: steps }, (_, i) => {
        const angle = i * 2 * Math.PI / steps;
        const cx = -offset + Math.sin(angle) * (r / 2 - size);
        const cy = -offset - Math.cos(angle) * (r / 2 - size);
        return `<circle class="${className}" id="${prefix}${i}" cx="${cx}" cy="${cy}" r="${size}"/>`;
    }).join("");
};

const drawClock = id => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const clockElem = document.getElementById(id);
    clockElem.parentElement.style.width = (windowWidth < 2/3*windowHeight) ? "80%" : "40%";

     const size = r = clockElem.clientWidth;
     const cr = size / 75;
     clockElem.setAttribute("viewBox", `${-r} ${-r} ${r} ${r}`);
     clockElem.innerHTML = (
          drawCircle(size / 2, r, 12, cr, 'fivemin', 'fm')
        + drawCircle(size / 2, r * 0.9, 60, cr, 'second', 's')
        + `<text id="hm" text-anchor="middle" dominant-baseline="central" dx="-${r / 2}" dy="-${r / 2}">
                <tspan style="font-size:${r / 5}px"></tspan>
            </text>
            <text id="s" text-anchor="middle" dominant-baseline="central" dx="-${r / 2}" dy="-${r / 4}">
                <tspan style="font-size:${r / 10}px"></tspan>
            </text>`
     );
};

const setSecs = (id, date) => {
    const secs = date.getSeconds();
    const secElems = document.querySelectorAll(`#${id} circle.second`);
    secElems.forEach((elem, i) => elem.classList.toggle('active', i < secs));
    document.querySelector(`#${id} #hm tspan`).textContent = formatTime(date);
    document.querySelector(`#${id} #s tspan`).textContent = formatDigits(secs);
};

document.addEventListener('DOMContentLoaded', () => {
    showLevel();
    drawClock('clock1');
    drawClock('clock2');

    updateEvents();
    setInterval(showLevel, 5 * SEC);
    setInterval(() => {
        synchronize(() => {
            const now = getNow();
            setSecs('clock1', now);
            showEvents(events, now);
            showRuntime(events, now);
        });
    }, 0.5 * SEC);

    setInterval(updateEvents, 60 * SEC);

    document.getElementById('meters').addEventListener('click', () => {
        document.getElementById('in-left').classList.toggle('hidden');
        document.getElementById('in-right').classList.toggle('hidden');
    });

    window.addEventListener('resize', () => {
        drawClock('clock1');
        drawClock('clock2');
    });
});

