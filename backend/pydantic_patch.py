"""
Compatibility patch for Pydantic v1 on Python 3.15+ (PEP 649 / PEP 749 __annotate_func__).
Resolves lazy annotations from class namespace before ModelMetaclass processing.
"""
import pydantic.main

_orig_model_metaclass_new = pydantic.main.ModelMetaclass.__new__

def _patched_model_metaclass_new(mcls, name, bases, namespace, **kwargs):
    if '__annotations__' not in namespace and '__annotate_func__' in namespace:
        try:
            annotations = namespace['__annotate_func__'](1)
            if isinstance(annotations, dict):
                namespace['__annotations__'] = annotations
        except Exception:
            pass
    return _orig_model_metaclass_new(mcls, name, bases, namespace, **kwargs)

pydantic.main.ModelMetaclass.__new__ = _patched_model_metaclass_new
