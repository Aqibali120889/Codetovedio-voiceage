/**
 * Visual Asset Manager.
 * Validates local asset existence, catalogs assets in an AssetManifest,
 * retrieves high-quality Pixabay assets for narration-aware scenes,
 * and ensures no unverified or missing file paths are passed to Remotion.
 */

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { AssetItem, AssetManifest } from "../types";
import type { VideoBlueprint } from "../../video-engine/types";
import { retrieveBestImageAsset } from "./asset-retriever";

export class AssetManager {
  private assets: Map<string, AssetItem> = new Map();

  public registerAsset(
    filePath: string,
    type: AssetItem["type"],
    source: AssetItem["source"] = "local",
    metadata: { attribution?: string; license?: string; mimeType?: string } = {}
  ): AssetItem {
    // If local file, verify existence
    const isRemote = filePath.startsWith("http://") || filePath.startsWith("https://");
    const resolvedPath = isRemote ? filePath : path.resolve(filePath);

    if (!isRemote && !fs.existsSync(resolvedPath)) {
      throw new Error(`Cannot register missing asset at: ${resolvedPath}`);
    }

    const id = `asset_${uuidv4().slice(0, 8)}`;
    const item: AssetItem = {
      asset_id: id,
      type,
      source,
      path: resolvedPath,
      mime_type: metadata.mimeType,
      attribution: metadata.attribution,
      license: metadata.license,
    };

    this.assets.set(id, item);
    return item;
  }

  public getAsset(id: string): AssetItem | undefined {
    return this.assets.get(id);
  }

  public getManifest(): AssetManifest {
    return {
      manifest_id: `manifest_${Date.now()}`,
      assets: Array.from(this.assets.values()),
    };
  }

  public validateAssetsExist(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const asset of this.assets.values()) {
      if (asset.path.startsWith("http://") || asset.path.startsWith("https://")) {
        continue; // Remote assets are verified at retrieval time
      }
      if (!fs.existsSync(asset.path)) {
        missing.push(asset.path);
      }
    }
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Enriches scenes in the blueprint with relevant visual assets.
   * If a scene is parallax_hero or lacks an image_url, queries Pixabay
   * (or cache) using concepts extracted from the scene narration.
   * Never throws if Pixabay is unconfigured or unavailable; falls back gracefully.
   */
  public async enrichBlueprintWithAssets(
    blueprint: VideoBlueprint,
    cacheDir?: string
  ): Promise<{ enrichedCount: number; warnings: string[] }> {
    const warnings: string[] = [];
    let enrichedCount = 0;

    const orientation =
      blueprint.aspect_ratio === "16:9" ? "landscape" : "portrait";

    const photoSceneTypes = new Set([
      "parallax_hero",
      "editorial_montage",
      "document_reveal",
      "split_callout",
      "split_comparison",
      "quote_insight",
      "word_by_word",
      "comparison_grid",
    ]);

    for (const scene of blueprint.scenes) {
      const needsImage =
        photoSceneTypes.has(scene.scene_type) ||
        scene.purpose === "hook" ||
        scene.purpose === "context" ||
        scene.purpose === "comparison" ||
        Boolean(scene.visual_description && /photo|image|screenshot|picture|visual|footage/i.test(scene.visual_description));

      if (needsImage && !scene.image_url) {
        try {
          const res = await retrieveBestImageAsset(
            scene.narration,
            scene.visual_description,
            blueprint.topic,
            {
              orientation,
              cacheDir,
            }
          );

          if (res.asset) {
            scene.image_url = res.asset.url;
            enrichedCount++;

            const id = `asset_${res.asset.pixabay_id ? `pixabay_${res.asset.pixabay_id}` : uuidv4().slice(0, 8)}`;
            this.assets.set(id, {
              asset_id: id,
              type: "image",
              source: res.asset.type === "local_fallback" ? "local" : "retrieved",
              path: res.asset.url,
              mime_type: res.asset.url.startsWith("data:") ? "image/svg+xml" : "image/jpeg",
              attribution: res.asset.attribution || (res.asset.type === "local_fallback" ? "Voiceage Studio Curated Graphics" : "Pixabay"),
              license: res.asset.type === "local_fallback" ? "Voiceage Studio License" : "Pixabay Free License",
            });
            console.log(
              `[AssetManager] Enriched scene "${scene.id}" (${scene.scene_type}) with asset: ${res.asset.url.slice(0, 60)}...`
            );
          } else if (res.error) {
            warnings.push(`Scene "${scene.id}": asset retrieval skipped (${res.error})`);
          }
        } catch (err) {
          warnings.push(`Scene "${scene.id}": asset retrieval error: ${(err as Error).message}`);
        }
      }
    }

    return { enrichedCount, warnings };
  }
}
