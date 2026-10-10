"""Fast, dependency-free inference for gradient-boosted trees.

scikit-learn's predict() walks trees one by one in Python (hundreds of ms for a single row, and a heavy import).
Here the fitted trees are flattened into padded numpy arrays and evaluated for all trees at once, so serving needs
only numpy. `compile_hgb` is used at training/export time; `evaluate` at request time.
"""
import numpy as np


def compile_hgb(model) -> dict[str, np.ndarray]:
    trees = [it[0].nodes for it in model._predictors]
    width = max(len(t) for t in trees)
    T = len(trees)
    feat = np.zeros((T, width), dtype=np.int32)
    thr = np.zeros((T, width), dtype=np.float64)
    left = np.zeros((T, width), dtype=np.int32)
    right = np.zeros((T, width), dtype=np.int32)
    val = np.zeros((T, width), dtype=np.float64)
    for i, nodes in enumerate(trees):
        n = len(nodes)
        feat[i, :n] = nodes["feature_idx"]
        thr[i, :n] = nodes["num_threshold"]
        val[i, :n] = nodes["value"]
        is_leaf = nodes["is_leaf"].astype(bool)
        idx = np.arange(n)
        left[i, :n] = np.where(is_leaf, idx, nodes["left"])   # leaves point at themselves
        right[i, :n] = np.where(is_leaf, idx, nodes["right"])
        left[i, n:] = right[i, n:] = np.arange(n, width)
    depth = int(max(nodes["depth"].max() for nodes in trees)) + 1
    return {"feat": feat, "thr": thr, "left": left, "right": right, "val": val,
            "base": np.float64(np.asarray(model._baseline_prediction).ravel()[0]), "depth": np.int32(depth)}


def evaluate(c: dict[str, np.ndarray], X: np.ndarray) -> np.ndarray:
    """Raw model output for each row of X (n_rows, n_features)."""
    T, W = c["feat"].shape
    R = X.shape[0]
    feat, thr, left, right, val = (c[k].ravel() for k in ("feat", "thr", "left", "right", "val"))
    off = (np.arange(T, dtype=np.int64) * W)[:, None]
    cols = np.arange(R)[None, :]
    node = np.zeros((T, R), dtype=np.int64)
    for _ in range(int(c["depth"])):
        p = off + node
        go_left = X[cols, feat[p]] <= thr[p]
        node = np.where(go_left, left[p], right[p])
    return float(c["base"]) + val[off + node].sum(axis=0)
