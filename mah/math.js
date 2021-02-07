
window.skewtMath=
{
    // Linear interpolation
    // The values (y1 and y2) can be arrays
    linearInterpolate:  function(x1, y1, x2, y2, x) {
      if (x1 == x2) {
        return y1;
      }
      const w = (x - x1) / (x2 - x1);

      if (Array.isArray(y1)) {
        return y1.map((y1, i) => y1 * (1 - w) + y2[i] * w);
      }

      return y1 * (1 - w) + y2 * w;
    },

    // Sampling at at targetXs with linear interpolation
    // xs and ys must have the same length.
    sampleAt:  function(xs, ys, targetXs) {
      const descOrder = xs[0] > xs[1];
      return targetXs.map((tx) => {
        let index = xs.findIndex((x) => (descOrder ? x <= tx : x >= tx));
        if (index == -1) {
          index = xs.length - 1;
        } else if (index == 0) {
          index = 1;
        }
        return linearInterpolate(xs[index - 1], ys[index - 1], xs[index], ys[index], tx);
      });
    },

    // x?s must be sorted in ascending order.
    // x?s and y?s must have the same length.
    // return [x, y] or null when no intersection found.
    firstIntersection:  function(x1s, y1s, x2s, y2s) {
      // Find all the points in the intersection of the 2 x ranges
      const min = Math.max(x1s[0], x2s[0]);
      const max = Math.min(x1s[x1s.length - 1], x2s[x2s.length - 1]);
      const xs = Array.from(new Set([...x1s, ...x2s]))
        .filter((x) => x >= min && x <= max)
        .sort((a, b) => (Number(a) > Number(b) ? 1 : -1));
      // Interpolate the lines for all the points of that intersection
      const iy1s = sampleAt(x1s, y1s, xs);
      const iy2s = sampleAt(x2s, y2s, xs);
      // Check if each segment intersect
      for (let index = 0; index < xs.length - 1; index++) {
        const y11 = iy1s[index];
        const y21 = iy2s[index];
        const x1 = xs[index];
        if (y11 == y21) {
          return [x1, y11];
        }
        const y12 = iy1s[index + 1];
        const y22 = iy2s[index + 1];
        if (Math.sign(y21 - y11) != Math.sign(y22 - y12)) {
          const x2 = xs[index + 1];
          const width = x2 - x1;
          const slope1 = (y12 - y11) / width;
          const slope2 = (y22 - y21) / width;
          const dx = (y21 - y11) / (slope1 - slope2);
          const dy = dx * slope1;
          return [x1 + dx, y11 + dy];
        }
      }
      return null;
    },

    zip:  function(a, b) {
      return a.map((v, i) => [v, b[i]]);
    },

    scaleLinear:  function(from, to) {
      const scale = (v) => sampleAt(from, to, [v])[0];
      scale.invert = (v) => sampleAt(to, from, [v])[0];
      return scale;
    },

    scaleLog:  function(from, to) {
      from = from.map(Math.log);
      const scale = (v) => sampleAt(from, to, [Math.log(v)])[0];
      scale.invert = (v) => Math.exp(sampleAt(to, from, [v])[0]);
      return scale;
    },

    line:  function(x, y) {
      return (d) => {
        const points = d.map((v) => x(v).toFixed(1) + "," + y(v).toFixed(1));
        return "M" + points.join("L");
      };
    },

    lerp:  function(v0, v1, weight) {
      return v0 + weight * (v1 - v0);
    }
}
