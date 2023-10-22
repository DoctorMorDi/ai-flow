from typing import List
from injector import Injector, Binder, Module
from .processors.observer.event_emitter import EventEmitter
from .processors.observer.observer import Observer
from .storage.local_storage_strategy import LocalStorageStrategy
from .storage.s3_storage_strategy import S3StorageStrategy
from .storage.storage_strategy import StorageStrategy
from .env_config import is_cloud_env
from .processors.factory.processor_factory import ProcessorFactory
from .processors.factory.processor_factory_iter_modules import (
    ProcessorFactoryIterModules,
)
from .processors.launcher.processor_launcher import ProcessorLauncher
from .processors.launcher.basic_ws_processor_launcher import BasicWSProcessorLauncher


class ProcessorFactoryModule(Module):
    def configure(self, binder: Binder):
        binder.bind(ProcessorFactory, to=ProcessorFactoryIterModules)


class StorageModule(Module):
    def configure(self, binder: Binder):
        if is_cloud_env():
            binder.bind(StorageStrategy, to=S3StorageStrategy)
        else:
            binder.bind(StorageStrategy, to=LocalStorageStrategy)


class ProcessorLauncherModule(Module):
    def configure(self, binder: Binder):
        binder.bind(ProcessorLauncher, to=BasicWSProcessorLauncher)
        binder.multibind(List[Observer], to=[EventEmitter()])


def create_application_injector() -> Injector:
    injector = Injector(
        [ProcessorFactoryModule(), StorageModule(), ProcessorLauncherModule()],
        auto_bind=True,
    )
    return injector


root_injector: Injector = create_application_injector()
