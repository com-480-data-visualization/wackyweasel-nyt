// Shared typewriter utility (D3-based)
// COM-480 - EPFL

window.Typewriter = (function () {
    const nearby = {
        a:'sq',b:'vn',c:'xv',d:'sf',e:'wr',f:'dg',g:'fh',h:'gj',i:'uo',j:'hk',
        k:'jl',l:'k',m:'n',n:'bm',o:'ip',p:'o',q:'w',r:'et',s:'ad',t:'ry',
        u:'yi',v:'cb',w:'qe',x:'zc',y:'tu',z:'x'
    };

    // Type text into a DOM element with optional typo simulation.
    // Returns a promise with a .cancel() method.
    function typewrite(el, text, speed, typoChance) {
        typoChance = typoChance || 0;
        const sel = d3.select(el);
        let timer = null;
        let cancelled = false;

        const promise = new Promise(resolve => {
            sel.classed('typing', true).text('');
            const cursor = sel.append('span')
                .attr('class', 'typewriter-cursor')
                .html('&nbsp;');
            const cursorNode = cursor.node();

            let i = 0;

            function schedule(fn, delay) {
                timer = d3.timeout(fn, delay);
            }

            function tick() {
                if (cancelled) { resolve(); return; }
                if (i < text.length) {
                    const ch = text[i];
                    const keys = nearby[ch.toLowerCase()];
                    if (typoChance > 0 && keys && Math.random() < typoChance) {
                        const wrong = keys[Math.floor(Math.random() * keys.length)];
                        el.insertBefore(document.createTextNode(wrong), cursorNode);
                        schedule(() => {
                            if (cancelled) { resolve(); return; }
                            cursorNode.previousSibling.remove();
                            schedule(() => {
                                if (cancelled) { resolve(); return; }
                                el.insertBefore(document.createTextNode(ch), cursorNode);
                                i++;
                                schedule(tick, speed);
                            }, speed);
                        }, speed * 3);
                    } else {
                        el.insertBefore(document.createTextNode(ch), cursorNode);
                        i++;
                        schedule(tick, speed);
                    }
                } else {
                    schedule(() => {
                        resolve();
                    }, 400);
                }
            }
            tick();
        });

        promise.cancel = function () {
            cancelled = true;
            if (timer) { timer.stop(); timer = null; }
        };

        return promise;
    }

    return { typewrite, nearby };
})();
