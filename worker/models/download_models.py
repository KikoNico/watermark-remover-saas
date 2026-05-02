import os
from worker.config import MODELS_CACHE


def download_florence2():
    print("Descargando Florence-2 (~2 GB). Puede tardar varios minutos...")
    from transformers import AutoProcessor, AutoModelForCausalLM

    AutoProcessor.from_pretrained(
        "microsoft/Florence-2-large",
        trust_remote_code=True,
        cache_dir=MODELS_CACHE,
    )
    AutoModelForCausalLM.from_pretrained(
        "microsoft/Florence-2-large",
        trust_remote_code=True,
        attn_implementation="eager",
        cache_dir=MODELS_CACHE,
    )
    print("Florence-2 descargado correctamente.")


def download_lama():
    print("Descargando modelo LaMA (~500 MB)...")
    try:
        from simple_lama_inpainting import SimpleLama
        SimpleLama()
        print("LaMA descargado correctamente.")
    except ImportError:
        print("simple_lama_inpainting no instalado — se usará OpenCV como alternativa.")


def main():
    os.makedirs(MODELS_CACHE, exist_ok=True)
    print(f"Modelos se guardarán en: {MODELS_CACHE}\n")

    download_florence2()
    print()
    download_lama()

    print("\nTodos los modelos listos. Puedes arrancar el worker con: python worker.py")


if __name__ == "__main__":
    main()
